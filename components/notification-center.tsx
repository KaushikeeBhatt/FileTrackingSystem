"use client"

import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  fileId?: string
}

interface NotificationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  fileApprovalNotifications: boolean
  fileUploadNotifications: boolean
  systemAlertNotifications: boolean
  digestFrequency: string
}

export function NotificationCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: false,
    fileApprovalNotifications: true,
    fileUploadNotifications: true,
    systemAlertNotifications: true,
    digestFrequency: "immediate",
  })

  useEffect(() => {
    if (user) {
      fetchNotifications()
      fetchUnreadCount()
      fetchPreferences()
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await authFetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await authFetch("/api/notifications/unread-count")
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error)
    }
  }

  const fetchPreferences = async () => {
    try {
      const response = await authFetch("/api/notifications/preferences")
      if (response.ok) {
        const data = await response.json()
        if (data.preferences) {
          setPreferences(data.preferences)
        }
      }
    } catch (error) {
      console.error("Failed to fetch preferences:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await authFetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await authFetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await authFetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== notificationId))
        fetchUnreadCount()
      }
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const response = await authFetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPreferences),
      })
      if (response.ok) {
        setPreferences((prev) => ({ ...prev, ...newPreferences }))
      }
    } catch (error) {
      console.error("Failed to update preferences:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "file_approval_pending":
        return "⏳"
      case "file_approved":
        return "✅"
      case "file_rejected":
        return "❌"
      case "file_shared":
        return "📤"
      case "system_alert":
        return "🚨"
      default:
        return "📢"
    }
  }

  if (!user) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showSettings ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <Switch
                id="email-notifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => updatePreferences({ emailNotifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="file-approval">File Approvals</Label>
              <Switch
                id="file-approval"
                checked={preferences.fileApprovalNotifications}
                onCheckedChange={(checked) => updatePreferences({ fileApprovalNotifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="file-upload">File Uploads</Label>
              <Switch
                id="file-upload"
                checked={preferences.fileUploadNotifications}
                onCheckedChange={(checked) => updatePreferences({ fileUploadNotifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="system-alerts">System Alerts</Label>
              <Switch
                id="system-alerts"
                checked={preferences.systemAlertNotifications}
                onCheckedChange={(checked) => updatePreferences({ systemAlertNotifications: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Digest Frequency</Label>
              <Select
                value={preferences.digestFrequency}
                onValueChange={(value) => updatePreferences({ digestFrequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-96">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No notifications yet</div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-3 border-b hover:bg-muted/50 transition-colors ${
                      !notification.isRead ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button variant="ghost" size="sm" onClick={() => markAsRead(notification._id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification._id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
