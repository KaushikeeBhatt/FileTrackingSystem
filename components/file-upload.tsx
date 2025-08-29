"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, X, File, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  onUploadComplete?: () => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [metadata, setMetadata] = useState({
    category: "",
    department: user?.department || "",
    description: "",
    tags: "",
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map((f) => f.errors.map((e) => e.message).join(", ")).join("; ")
      showToast(`Upload failed: ${errors}`, "error")
    },
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      showToast("Please select files to upload", "warning")
      return
    }

    if (!metadata.category) {
      showToast("Please select a category", "warning")
      return
    }

    setUploading(true)

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("category", metadata.category)
        formData.append("department", metadata.department)
        formData.append("description", metadata.description)
        formData.append("tags", metadata.tags)

        const response = await authFetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Upload failed")
        }

        return response.json()
      })

      await Promise.all(uploadPromises)

      showToast(`Successfully uploaded ${files.length} file(s)`, "success")
      setFiles([])
      setMetadata((prev) => ({ ...prev, description: "", tags: "" }))

      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Upload failed", "error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Files
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drag & Drop Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop files here...</p>
          ) : (
            <div>
              <p className="text-slate-600 dark:text-slate-300 mb-2">Drag & drop files here, or click to select</p>
              <p className="text-sm text-slate-500">Maximum file size: 50MB</p>
            </div>
          )}
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files ({files.length})</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded"
                >
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={uploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={metadata.category}
              onValueChange={(value) => setMetadata((prev) => ({ ...prev, category: value }))}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
                <SelectItem value="presentations">Presentations</SelectItem>
                <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
                <SelectItem value="archives">Archives</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={metadata.department}
              onChange={(e) => setMetadata((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="Department"
              disabled={uploading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={metadata.tags}
            onChange={(e) => setMetadata((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="urgent, contract, 2024"
            disabled={uploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={metadata.description}
            onChange={(e) => setMetadata((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the files..."
            rows={3}
            disabled={uploading}
          />
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading || !metadata.category}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading {files.length} file(s)...
            </>
          ) : (
            `Upload ${files.length} file(s)`
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
