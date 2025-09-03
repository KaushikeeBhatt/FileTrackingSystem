"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Share2, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { authFetch } from "@/lib/auth-fetch"

interface FileSharingProps {
  fileId: string
  fileName: string
}

export function FileSharing({ fileId, fileName }: FileSharingProps) {
  const { user } = useAuth()
  const [shares, setShares] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareForm, setShareForm] = useState({
    sharedWith: "",
    permissions: "read" as "read" | "edit" | "download",
    expiresAt: "",
  })
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const response = await authFetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users.filter((u: any) => u._id !== user?.id))
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }, [user])

  const shareFile = async () => {
    try {
      const response = await authFetch(`/api/files/${fileId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shareForm),
      })

      if (response.ok) {
        setShowShareDialog(false)
        setShareForm({ sharedWith: "", permissions: "read", expiresAt: "" })
        setError(null)
        // Refresh shares list
      } else {
        const data = await response.json()
        setError(data.error)
      }
    } catch (error) {
      console.error("Share failed:", error)
    }
  }

  useEffect(() => {
    if (showShareDialog) {
      fetchUsers();
    }
  }, [showShareDialog, fetchUsers]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            File Sharing
          </CardTitle>
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Users className="mr-2 h-4 w-4" />
                Share File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share &quot;{fileName}&quot;</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <div className="text-red-500 text-sm">
                    The file &quot;{fileName}&quot; can&apos;t be shared. {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Share with User</Label>
                  <Select
                    value={shareForm.sharedWith}
                    onValueChange={(value) => setShareForm((prev) => ({ ...prev, sharedWith: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <Select
                    value={shareForm.permissions}
                    onValueChange={(value: "read" | "edit" | "download") =>
                      setShareForm((prev) => ({ ...prev, permissions: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read Only</SelectItem>
                      <SelectItem value="download">Download</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expires At (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={shareForm.expiresAt}
                    onChange={(e) => setShareForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>

                <Button onClick={shareFile} className="w-full">
                  Share File
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4 text-slate-600">
          <Share2 className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p>File sharing functionality is now available</p>
        </div>
      </CardContent>
    </Card>
  )
}
