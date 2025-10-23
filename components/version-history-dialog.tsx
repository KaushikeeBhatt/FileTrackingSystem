"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Download, 
  RotateCcw, 
  Calendar, 
  User, 
  FileText, 
  Hash,
  AlertTriangle
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"


export interface FileMetadata {
  version: number
  checksum?: string       // optional if sometimes missing
  accessCount?: number    // optional if sometimes missing
}

interface FileVersion {
  _id: string
  version: number
  filePath: string
  fileSize: number
  uploadedBy: string
  uploadedAt: string
  changes?: string
  checksum: string
}

interface FileRecord {
  _id: string
  fileName: string
  originalName: string
  metadata: {
    version: number
    checksum: string
  }
}

interface VersionHistoryDialogProps {
  file: FileRecord
  isOpen: boolean
  onClose: () => void
  onVersionChange?: () => void
}

export function VersionHistoryDialog({ 
  file, 
  isOpen, 
  onClose, 
  onVersionChange 
}: VersionHistoryDialogProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [rollbackLoading, setRollbackLoading] = useState<number | null>(null)

  const canRollback = user?.role === 'admin' || user?.role === 'manager'

  const fetchVersions = async () => {
    if (!file._id) return
    
    setLoading(true)
    try {
      const response = await authFetch(`/api/files/${file._id}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions || [])
      } else {
        showToast("Failed to load version history", "error")
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error)
      showToast("Error loading version history", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (version: number) => {
    if (!canRollback || !file._id) return

    if (!confirm(`Are you sure you want to rollback to version ${version}? This will create a new version.`)) {
      return
    }

    setRollbackLoading(version)
    try {
      const response = await authFetch(`/api/files/${file._id}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version }),
      })

      if (response.ok) {
        const data = await response.json()
        showToast(`Successfully rolled back to version ${version}. New version: ${data.version}`, "success")
        await fetchVersions() // Refresh version list
        onVersionChange?.() // Notify parent to refresh
      } else {
        const errorData = await response.json()
        showToast(`Rollback failed: ${errorData.error}`, "error")
      }
    } catch (error) {
      console.error("Rollback failed:", error)
      showToast("Error during rollback operation", "error")
    } finally {
      setRollbackLoading(null)
    }
  }

  const handleDownloadVersion = async (version: FileVersion) => {
    try {
      const response = await authFetch(`/api/files/${file._id}/versions/${version._id}/download`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${file.originalName}_v${version.version}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast(`Downloaded version ${version.version}`, "success")
      } else {
        const errorData = await response.json()
        showToast(`Download failed: ${errorData.error}`, "error")
      }
    } catch (error) {
      console.error("Download failed:", error)
      showToast("Failed to download version", "error")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  useEffect(() => {
    if (isOpen && file._id) {
      fetchVersions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, file._id])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Version History: {file.originalName}
          </DialogTitle>
          <DialogDescription>
            View and manage different versions of this file. Current version: {file.metadata?.version || 1}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading version history...</span>
            </div>
          ) : versions.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No version history found for this file.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Checksum</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => {
                    const isCurrentVersion = version.version === file.metadata?.version
                    const isRollingBack = rollbackLoading === version.version

                    return (
                      <TableRow key={version._id} className={isCurrentVersion ? "bg-blue-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={isCurrentVersion ? "default" : "secondary"}>
                              v{version.version}
                            </Badge>
                            {isCurrentVersion && (
                              <Badge variant="outline" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(version.fileSize)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="text-sm">{version.uploadedBy}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(version.uploadedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {version.changes ? (
                              <span className="text-sm text-slate-600 truncate block">
                                {version.changes}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No description</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-slate-400" />
                            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                              {version.checksum.substring(0, 8)}...
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadVersion(version)}
                              title={`Download version ${version.version}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            
                            {canRollback && !isCurrentVersion && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRollback(version.version)}
                                disabled={isRollingBack}
                                title={`Rollback to version ${version.version}`}
                              >
                                {isRollingBack ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}