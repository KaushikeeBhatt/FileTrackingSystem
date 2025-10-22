"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/auth-fetch"

interface ShareFileDialogProps {
  file: {
    _id: string
    originalName: string
  }
  onClose: () => void
  onShareSuccess: () => void
}

export function ShareFileDialog({ file, onClose, onShareSuccess }: ShareFileDialogProps) {
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<"view" | "edit">("view")
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleShare = async () => {
    if (!email) {
      showToast("Please enter an email address.", "error")
      return
    }

    setLoading(true)
    try {
      const response = await authFetch(`/api/files/${file._id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, permission }),
      })

      if (response.ok) {
        onShareSuccess()
      } else {
        const errorData = await response.json()
        showToast(`Failed to share file: ${errorData.error}`, "error")
      }
    } catch (error) {
      console.error("Share failed:", error)
      showToast("An unexpected error occurred while sharing the file.", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {file.originalName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="recipient@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permission">Permission</Label>
            <Select value={permission} onValueChange={(value: "view" | "edit") => setPermission(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Can view</SelectItem>
                <SelectItem value="edit">Can edit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading}>
            {loading ? "Sharing..." : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
