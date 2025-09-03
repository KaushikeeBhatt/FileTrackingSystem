import { type NextRequest, NextResponse } from "next/server"
import { withAuthAndRateLimit } from "@/lib/middleware/rate-limit"
import { getFileById, createAuditLog, updateFileAccess } from "@/lib/database-operations"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

async function filesHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    // Build filters
    const filters: any = {}

    // Role-based filtering & status adjustments
    if (user.role === "user") {
      filters.uploadedBy = new ObjectId(user.id)
    } else if ((user.role === "admin" || user.role === "manager") && !status) {
      // For admins/managers, if no status is specified, show active and pending files
      filters.$or = [{ status: "active" }, { status: "pending_approval" }]
    } else if (status && status !== "all") {
      filters.status = status
    } else if (!status) {
      filters.status = "active" // Default to active files if no status is provided
    }

    if (category && category !== "all") {
      filters.category = category
    }

    let files
    if (search) {
      const db = await getDatabase()
      files = await db.collection("files").find({
        $text: { $search: search },
        ...filters
      }).limit(limit).toArray()
    } else {
      const db = await getDatabase()
      files = await db
        .collection("files")
        .aggregate([
          { $match: filters },
          {
            $lookup: {
              from: "users",
              localField: "uploadedBy",
              foreignField: "_id",
              as: "uploadedBy",
            },
          },
          {
            $unwind: "$uploadedBy",
          },
          {
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
              "uploadedBy.name": 1,
              "uploadedBy.email": 1,
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          { $skip: skip },
        ])
        .toArray()
    }

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Files fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}

export const GET = withAuthAndRateLimit(filesHandler, undefined, "GENERAL")
