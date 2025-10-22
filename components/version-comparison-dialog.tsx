"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ArrowLeftRight, 
  Calendar, 
  User, 
  FileText, 
  Hash,
  HardDrive,
  AlertTriangle
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

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

interface VersionComparisonDialogProps {
  file: FileRecord
  isOpen: boolean
  onClose: () => void
}

export function VersionComparisonDialog({ 
  file, 
  isOpen, 
  onClose 
}: VersionComparisonDialogProps) {
  const { showToast } = useToast()
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVersion1, setSelectedVersion1] = useState<string>("")
  const [selectedVersion2, setSelectedVersion2] = useState<string>("")

  const version1 = versions.find(v => v._id === selectedVersion1)
  const version2 = versions.find(v => v._id === selectedVersion2)

  const fetchVersions = async () => {
    if (!file._id) return
    
    setLoading(true)
    try {
      const response = await authFetch(`/api/files/${file._id}/versions`)
      if (response.ok) {
        const data = await response.json()
        const versionList = data.versions || []
        setVersions(versionList)
        
        // Auto-select the two most recent versions for comparison
        if (versionList.length >= 2) {
          setSelectedVersion1(versionList[0]._id) // Most recent
          setSelectedVersion2(versionList[1]._id) // Second most recent
        }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getSizeDifference = () => {
    if (!version1 || !version2) return null
    const diff = version1.fileSize - version2.fileSize
    if (diff === 0) return { text: "Same size", color: "text-slate-600" }
    if (diff > 0) return { text: `+${formatFileSize(diff)} larger`, color: "text-red-600" }
    return { text: `${formatFileSize(Math.abs(diff))} smaller`, color: "text-green-600" }
  }

  const getChecksumMatch = () => {
    if (!version1 || !version2) return null
    return version1.checksum === version2.checksum
  }

  useEffect(() => {
    if (isOpen && file._id) {
      fetchVersions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, file._id])

  const ComparisonCard = ({ version, title }: { version: FileVersion | undefined, title: string }) => (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {version ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{version.version}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4 text-slate-400" />
                <span>{formatFileSize(version.fileSize)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-slate-400" />
                <span>{version.uploadedBy}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{formatDistanceToNow(new Date(version.uploadedAt), { addSuffix: true })}</span>
              </div>
              
              <div className="flex items-start gap-2 text-sm">
                <Hash className="h-4 w-4 text-slate-400 mt-0.5" />
                <code className="text-xs bg-slate-100 px-2 py-1 rounded break-all">
                  {version.checksum}
                </code>
              </div>
            </div>
            
            {version.changes && (
              <div className="p-3 bg-slate-50 rounded border-l-4 border-blue-500">
                <p className="text-sm font-medium text-slate-700 mb-1">Changes:</p>
                <p className="text-sm text-slate-600">{version.changes}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">
            Select a version to compare
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Compare Versions: {file.originalName}
          </DialogTitle>
          <DialogDescription>
            Compare different versions of this file to see what changed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading versions...</span>
            </div>
          ) : versions.length < 2 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                At least 2 versions are needed for comparison. This file only has {versions.length} version(s).
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Version Selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Version 1 (Left)</label>
                  <Select value={selectedVersion1} onValueChange={setSelectedVersion1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select first version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((version) => (
                        <SelectItem key={version._id} value={version._id}>
                          v{version.version} - {formatDistanceToNow(new Date(version.uploadedAt), { addSuffix: true })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Version 2 (Right)</label>
                  <Select value={selectedVersion2} onValueChange={setSelectedVersion2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select second version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((version) => (
                        <SelectItem key={version._id} value={version._id}>
                          v{version.version} - {formatDistanceToNow(new Date(version.uploadedAt), { addSuffix: true })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Comparison Summary */}
              {version1 && version2 && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <h4 className="font-medium text-slate-900">Comparison Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Size difference: </span>
                      <span className={getSizeDifference()?.color}>
                        {getSizeDifference()?.text}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Content: </span>
                      <span className={getChecksumMatch() ? "text-green-600" : "text-red-600"}>
                        {getChecksumMatch() ? "Identical" : "Different"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Version gap: </span>
                      <span className="text-slate-600">
                        {Math.abs((version1?.version || 0) - (version2?.version || 0))} version(s)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-side Comparison */}
              <div className="flex gap-4 min-h-[400px]">
                <ComparisonCard version={version1} title={`Version ${version1?.version || "?"}`} />
                <ComparisonCard version={version2} title={`Version ${version2?.version || "?"}`} />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}