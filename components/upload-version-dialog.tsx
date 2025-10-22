"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Upload,
  File,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useToast } from "@/hooks/use-toast"

interface FileRecord {
  _id: string
  fileName: string
  originalName: string
  metadata: {
    version: number
    checksum: string
  }
}

interface UploadVersionDialogProps {
  file: FileRecord
  isOpen: boolean
  onClose: () => void
  onVersionUploaded?: () => void
}

export function UploadVersionDialog({
  file,
  isOpen,
  onClose,
  onVersionUploaded
}: UploadVersionDialogProps) {
  const { showToast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [changes, setChanges] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setUploadProgress(0)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !file._id) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      if (changes.trim()) {
        formData.append("changes", changes.trim())
      }

      // Simulate upload progress (since we can't get real progress from fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      const response = await authFetch(`/api/files/${file._id}/version`, {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()
        showToast(
          `New version uploaded successfully! Version ${data.version}`,
          "success"
        )
        onVersionUploaded?.()
        handleClose()
      } else {
        const errorData = await response.json()
        showToast(`Upload failed: ${errorData.error}`, "error")
      }
    } catch (error) {
      console.error("Upload failed:", error)
      showToast("Error uploading new version", "error")
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null)
      setChanges("")
      setUploadProgress(0)
      setDragActive(false)
      onClose()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Version
          </DialogTitle>
          <DialogDescription>
            Upload a new version of &quot;{file.originalName}&quot;. Current version: {file.metadata?.version || 1}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <div className="space-y-4">
            <Label>Select New File</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : selectedFile
                  ? "border-green-500 bg-green-50"
                  : "border-slate-300 hover:border-slate-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">{selectedFile.name}</p>
                    <p className="text-sm text-green-600">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={uploading}
                  >
                    Choose Different File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <File className="h-12 w-12 mx-auto text-slate-400" />
                  <div>
                    <p className="text-slate-600">
                      Drop your file here, or{" "}
                      <label className="text-blue-600 hover:text-blue-500 cursor-pointer underline">
                        browse
                        <Input
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={uploading}
                        />
                      </label>
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Upload a new version to replace the current file
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Changes Description */}
          <div className="space-y-2">
            <Label htmlFor="changes">Changes Description (Optional)</Label>
            <Textarea
              id="changes"
              placeholder="Describe what changed in this version..."
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              disabled={uploading}
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Help others understand what&apos;s new or different in this version
            </p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-slate-500 text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Uploading a new version will create version {(file.metadata?.version || 1) + 1} and 
              make it the current version. The previous version will be preserved in the version history.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Version {(file.metadata?.version || 1) + 1}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}