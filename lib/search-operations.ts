import { getDatabase } from "./mongodb"
import { ObjectId } from "mongodb"

export interface SearchFilters {
  query?: string
  status?: string
  category?: string
  department?: string
  uploadedBy?: string
  dateFrom?: Date
  dateTo?: Date
  fileType?: string
  tags?: string[]
  minSize?: number
  maxSize?: number
}

export interface SearchResult {
  _id: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  uploadedBy: {
    _id: string
    name: string
    email: string
  }
  department: string
  category: string
  tags: string[]
  description?: string
  status: string
  createdAt: Date
  metadata: {
    version: number
    accessCount: number
  }
  relevanceScore?: number
}

export interface SearchSuggestion {
  type: "file" | "tag" | "category" | "department" | "user"
  value: string
  count: number
}

export class SearchOperations {
  private static async getDb() {
    return await getDatabase()
  }

  static async advancedSearch(
    filters: SearchFilters,
    userId: string,
    userRole: string,
    limit = 50,
    skip = 0,
  ): Promise<{ results: SearchResult[]; total: number }> {
    const db = await this.getDb()

    // Build MongoDB aggregation pipeline
    const pipeline: any[] = []

    // Match stage - build query conditions
    const matchConditions: any = {}

    // Role-based filtering
    if (userRole === "user") {
      matchConditions.uploadedBy = new ObjectId(userId)
    }

    // Status filter
    if (filters.status && filters.status !== "all") {
      matchConditions.status = filters.status
    }

    // Category filter
    if (filters.category && filters.category !== "all") {
      matchConditions.category = filters.category
    }

    // Department filter
    if (filters.department && filters.department !== "all") {
      matchConditions.department = filters.department
    }

    // File type filter
    if (filters.fileType && filters.fileType !== "all") {
      matchConditions.fileType = { $regex: filters.fileType, $options: "i" }
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      matchConditions.createdAt = {}
      if (filters.dateFrom) {
        matchConditions.createdAt.$gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        matchConditions.createdAt.$lte = new Date(filters.dateTo)
      }
    }

    // File size filter
    if (filters.minSize !== undefined || filters.maxSize !== undefined) {
      matchConditions.fileSize = {}
      if (filters.minSize !== undefined) {
        matchConditions.fileSize.$gte = filters.minSize
      }
      if (filters.maxSize !== undefined) {
        matchConditions.fileSize.$lte = filters.maxSize
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      matchConditions.tags = { $in: filters.tags }
    }

    // Uploaded by filter
    if (filters.uploadedBy && filters.uploadedBy !== "all") {
      matchConditions.uploadedBy = new ObjectId(filters.uploadedBy)
    }

    // Text search conditions
    if (filters.query && filters.query.trim()) {
      const searchRegex = { $regex: filters.query.trim(), $options: "i" }
      matchConditions.$or = [
        { fileName: searchRegex },
        { originalName: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { department: searchRegex },
        { category: searchRegex },
      ]
    }

    pipeline.push({ $match: matchConditions })

    // Add text search scoring if query exists
    if (filters.query && filters.query.trim()) {
      pipeline.push({
        $addFields: {
          relevanceScore: {
            $add: [
              { $cond: [{ $regexMatch: { input: "$originalName", regex: filters.query, options: "i" } }, 10, 0] },
              { $cond: [{ $regexMatch: { input: "$fileName", regex: filters.query, options: "i" } }, 8, 0] },
              { $cond: [{ $regexMatch: { input: "$description", regex: filters.query, options: "i" } }, 5, 0] },
              {
                $cond: [
                  {
                    $in: [
                      { $toLower: filters.query },
                      { $map: { input: "$tags", as: "tag", in: { $toLower: "$$tag" } } },
                    ],
                  },
                  7,
                  0,
                ],
              },
              { $cond: [{ $regexMatch: { input: "$category", regex: filters.query, options: "i" } }, 3, 0] },
              { $cond: [{ $regexMatch: { input: "$department", regex: filters.query, options: "i" } }, 2, 0] },
            ],
          },
        },
      })
    }

    // Lookup user information
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "uploadedBy",
        foreignField: "_id",
        as: "uploadedBy",
      },
    })

    pipeline.push({ $unwind: "$uploadedBy" })

    // Project fields
    pipeline.push({
      $project: {
        fileName: 1,
        originalName: 1,
        fileType: 1,
        fileSize: 1,
        department: 1,
        category: 1,
        tags: 1,
        description: 1,
        status: 1,
        createdAt: 1,
        metadata: 1,
        relevanceScore: 1,
        "uploadedBy._id": 1,
        "uploadedBy.name": 1,
        "uploadedBy.email": 1,
      },
    })

    // Sort by relevance score if search query exists, otherwise by date
    if (filters.query && filters.query.trim()) {
      pipeline.push({ $sort: { relevanceScore: -1, createdAt: -1 } })
    } else {
      pipeline.push({ $sort: { createdAt: -1 } })
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }]
    const countResult = await db.collection("files").aggregate(countPipeline).toArray()
    const total = countResult[0]?.total || 0

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limit })

    // Execute search
    const results = await db.collection("files").aggregate(pipeline).toArray()

    return {
      results: results as SearchResult[],
      total,
    }
  }

  static async getSearchSuggestions(query: string, userId: string, userRole: string): Promise<SearchSuggestion[]> {
    const db = await this.getDb()
    const suggestions: SearchSuggestion[] = []

    if (!query || query.length < 2) return suggestions

    const matchConditions: any = {}
    if (userRole === "user") {
      matchConditions.uploadedBy = new ObjectId(userId)
    }

    // Get file name suggestions
    const fileResults = await db
      .collection("files")
      .aggregate([
        {
          $match: {
            ...matchConditions,
            $or: [{ originalName: { $regex: query, $options: "i" } }, { fileName: { $regex: query, $options: "i" } }],
          },
        },
        { $limit: 5 },
        { $project: { originalName: 1 } },
      ])
      .toArray()

    fileResults.forEach((file) => {
      suggestions.push({
        type: "file",
        value: file.originalName,
        count: 1,
      })
    })

    // Get tag suggestions
    const tagResults = await db
      .collection("files")
      .aggregate([
        { $match: matchConditions },
        { $unwind: "$tags" },
        { $match: { tags: { $regex: query, $options: "i" } } },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray()

    tagResults.forEach((tag) => {
      suggestions.push({
        type: "tag",
        value: tag._id,
        count: tag.count,
      })
    })

    // Get category suggestions
    const categoryResults = await db
      .collection("files")
      .aggregate([
        { $match: { ...matchConditions, category: { $regex: query, $options: "i" } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ])
      .toArray()

    categoryResults.forEach((category) => {
      suggestions.push({
        type: "category",
        value: category._id,
        count: category.count,
      })
    })

    // Get department suggestions
    const deptResults = await db
      .collection("files")
      .aggregate([
        { $match: { ...matchConditions, department: { $regex: query, $options: "i" } } },
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ])
      .toArray()

    deptResults.forEach((dept) => {
      suggestions.push({
        type: "department",
        value: dept._id,
        count: dept.count,
      })
    })

    return suggestions.slice(0, 10)
  }

  static async saveSearch(userId: string, searchQuery: string, filters: SearchFilters): Promise<void> {
    const db = await this.getDb()

    await db.collection("saved_searches").insertOne({
      userId: new ObjectId(userId),
      searchQuery,
      filters,
      createdAt: new Date(),
    })
  }

  static async getSavedSearches(userId: string): Promise<any[]> {
    const db = await this.getDb()

    return await db
      .collection("saved_searches")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()
  }

  static async getSearchAnalytics(userId: string, userRole: string): Promise<any> {
    const db = await this.getDb()

    const matchConditions: any = {}
    if (userRole === "user") {
      matchConditions.uploadedBy = new ObjectId(userId)
    }

    // Get file statistics
    const stats = await db
      .collection("files")
      .aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: "$fileSize" },
            avgSize: { $avg: "$fileSize" },
            categories: { $addToSet: "$category" },
            departments: { $addToSet: "$department" },
          },
        },
      ])
      .toArray()

    // Get popular tags
    const popularTags = await db
      .collection("files")
      .aggregate([
        { $match: matchConditions },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray()

    // Get file type distribution
    const fileTypes = await db
      .collection("files")
      .aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: {
              $cond: {
                if: { $regexMatch: { input: "$fileType", regex: "image/" } },
                then: "Images",
                else: {
                  $cond: {
                    if: { $regexMatch: { input: "$fileType", regex: "video/" } },
                    then: "Videos",
                    else: {
                      $cond: {
                        if: { $regexMatch: { input: "$fileType", regex: "application/pdf" } },
                        then: "PDFs",
                        else: {
                          $cond: {
                            if: {
                              $regexMatch: {
                                input: "$fileType",
                                regex: "application/(msword|vnd.openxmlformats-officedocument.wordprocessingml)",
                              },
                            },
                            then: "Documents",
                            else: "Other",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            count: { $sum: 1 },
            totalSize: { $sum: "$fileSize" },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray()

    return {
      overview: stats[0] || {
        totalFiles: 0,
        totalSize: 0,
        avgSize: 0,
        categories: [],
        departments: [],
      },
      popularTags,
      fileTypes,
    }
  }
}
