"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Trash2, CheckCircle, MoreHorizontal, File, Calendar, User, Filter } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { formatDistanceToNow } from "date-fns"
import { AdvancedSearch } from "./advanced-search"
import { useToast } from "@/hooks/use-toast"

interface FileRecord {
  _id: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  uploadedBy: {
    name: string
    email: string
  }
  department: string
  category: string
  tags: string[]
  description?: string
  status: "active" | "archived" | "pending_approval" | "rejected"
  createdAt: string
  metadata: {
    version: number
    accessCount: number
  }
}

interface FileListProps {
  refreshTrigger?: number
}

export function FileList({ refreshTrigger }: FileListProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<any>({ results: [], total: 0 })
  const [currentFilters, setCurrentFilters] = useState<any>({})

  const performAdvancedSearch = async (filters: any) => {
    try {
      setLoading(true)
      setCurrentFilters(filters)

      const response = await authFetch("/api/search/advanced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filters),
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
        setFiles(data.results)
      }
    } catch (error) {
      console.error("Advanced search failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetSearch = () => {
    setCurrentFilters({})
    setSearchResults({ results: [], total: 0 })
    fetchFiles()
  }

  const fetchFiles = async () => {
    try {
      const response = await authFetch("/api/files")

      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (Object.keys(currentFilters).length === 0) {
      fetchFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, user])

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await authFetch(`/api/files/${fileId}/download`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      const response = await authFetch(`/api/files/${fileId}/delete`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchFiles()
        showToast("File deleted successfully", "success")
      } else {
        const errorData = await response.json()
        showToast(`Failed to delete file: ${errorData.error}`, "error")
      }
    } catch (error) {
      console.error("Delete failed:", error)
      showToast("An unexpected error occurred while deleting the file.", "error")
    }
  }

  const handleApprove = async (fileId: string) => {
    try {
      const response = await authFetch(`/api/files/${fileId}/approve`, {
        method: "POST",
      })

      if (response.ok) {
        fetchFiles()
        showToast("File approved successfully", "success")
      } else {
        const errorData = await response.json()
        showToast(`Failed to approve file: ${errorData.error}`, "error")
      }
    } catch (error) {
      console.error("Approve failed:", error)
      showToast("An unexpected error occurred while approving the file.", "error")
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      pending_approval: "secondary",
      rejected: "destructive",
      archived: "outline",
    } as const

    const labels = {
      active: "Active",
      pending_approval: "Pending",
      rejected: "Rejected",
      archived: "Archived",
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading files...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">Simple Search</TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simple">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <File className="h-5 w-5" />
                File Management
                {searchResults.total > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {searchResults.total} results
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-8">
                  <File className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">No files found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date</TableHead>
                        {searchResults.results.length > 0 && <TableHead>Relevance</TableHead>}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{file.originalName}</p>
                              {file.description && (
                                <p className="text-sm text-slate-500 truncate max-w-xs">{file.description}</p>
                              )}
                              {file.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {file.tags.slice(0, 3).map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {file.tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{file.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{file.category}</Badge>
                          </TableCell>
                          <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                          <TableCell>{getStatusBadge(file.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <p className="text-sm font-medium">{file.uploadedBy.name}</p>
                                <p className="text-xs text-slate-500">{file.department}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </TableCell>
                          {searchResults.results.length > 0 && (
                            <TableCell>
                              <Badge variant="outline">{(file as any).relevanceScore || 0}</Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownload(file._id, file.originalName)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>

                                {(user?.role === "admin" || user?.role === "manager") &&
                                  file.status === "pending_approval" && (
                                    <DropdownMenuItem onClick={() => handleApprove(file._id)}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Approve
                                    </DropdownMenuItem>
                                  )}

                                {(user?.role === "admin" || user?.role === "manager") && (
                                  <DropdownMenuItem onClick={() => handleDelete(file._id)} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedSearch onSearch={performAdvancedSearch} onReset={resetSearch} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
