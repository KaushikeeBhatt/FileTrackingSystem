"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Users,
  FileText,
  HardDrive,
  Activity,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Settings,
  AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { formatDistanceToNow } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalFiles: number
  totalStorage: number
  pendingApprovals: number
  recentActivity: number
  systemHealth: {
    database: "healthy" | "warning" | "error"
    storage: "healthy" | "warning" | "error"
    performance: "healthy" | "warning" | "error"
  }
}

interface UserData {
  _id: string
  name: string
  email: string
  role: string
  department: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
  fileCount: number
  storageUsed: number
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [pendingFiles, setPendingFiles] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    department: "",
  })

  const [message, setMessage] = useState({ type: "", text: "" })

  const fetchSystemStats = async () => {
    try {
      const response = await authFetch("/api/admin/stats")

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch system stats:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await authFetch("/api/admin/users")

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const fetchPendingFiles = async () => {
    try {
      const response = await authFetch("/api/files?status=pending_approval&limit=100")

      if (response.ok) {
        const data = await response.json()
        setPendingFiles(data.files)
      }
    } catch (error) {
      console.error("Failed to fetch pending files:", error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchSystemStats(), fetchUsers(), fetchPendingFiles()])
      setLoading(false)
    }

    fetchData()
  }, [])

  const createUser = async () => {
    try {
      const response = await authFetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        setMessage({ type: "success", text: "User created successfully" })
        setShowCreateUser(false)
        setNewUser({ name: "", email: "", password: "", role: "user", department: "" })
        fetchUsers()
      } else {
        const error = await response.json()
        setMessage({ type: "error", text: error.error || "Failed to create user" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create user" })
    }
  }

  const updateUser = async (userId: string, updates: any) => {
    try {
      const response = await authFetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        setMessage({ type: "success", text: "User updated successfully" })
        setEditingUser(null)
        fetchUsers()
      } else {
        setMessage({ type: "error", text: "Failed to update user" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update user" })
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return

    try {
      const response = await authFetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMessage({ type: "success", text: "User deactivated successfully" })
        fetchUsers()
      } else {
        setMessage({ type: "error", text: "Failed to deactivate user" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to deactivate user" })
    }
  }

  const bulkApproveFiles = async () => {
    if (selectedFiles.length === 0) return

    try {
      const response = await authFetch("/api/admin/files/bulk-approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileIds: selectedFiles }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: "success", text: `Approved ${data.count} files successfully` })
        setSelectedFiles([])
        fetchPendingFiles()
        fetchSystemStats()
      } else {
        setMessage({ type: "error", text: "Failed to approve files" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to approve files" })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getHealthBadge = (status: "healthy" | "warning" | "error") => {
    const variants = {
      healthy: "default",
      warning: "secondary",
      error: "destructive",
    } as const

    const colors = {
      healthy: "text-green-600",
      warning: "text-yellow-600",
      error: "text-red-600",
    }

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status}
      </Badge>
    )
  }

  if (user?.role !== "admin") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-slate-600">You don not have permission to access the admin dashboard.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading admin dashboard...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message.text && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* System Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-slate-500">{stats.activeUsers} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</div>
              <p className="text-xs text-slate-500">{stats.pendingApprovals} pending approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats.totalStorage)}</div>
              <p className="text-xs text-slate-500">Total storage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentActivity}</div>
              <p className="text-xs text-slate-500">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Database</span>
                {getHealthBadge(stats.systemHealth.database)}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Storage</span>
                {getHealthBadge(stats.systemHealth.storage)}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Performance</span>
                {getHealthBadge(stats.systemHealth.performance)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="files">File Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>Add a new user to the system</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newUser.name}
                          onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={newUser.department}
                          onChange={(e) => setNewUser((prev) => ({ ...prev, department: e.target.value }))}
                        />
                      </div>
                      <Button onClick={createUser} className="w-full">
                        Create User
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Storage</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userData) => (
                      <TableRow key={userData._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{userData.name}</p>
                            <p className="text-sm text-slate-500">{userData.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {userData.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{userData.department}</TableCell>
                        <TableCell>{userData.fileCount}</TableCell>
                        <TableCell>{formatFileSize(userData.storageUsed)}</TableCell>
                        <TableCell>
                          {userData.lastLogin
                            ? formatDistanceToNow(new Date(userData.lastLogin), { addSuffix: true })
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={userData.isActive ? "default" : "secondary"}>
                            {userData.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(userData)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUser(userData._id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending File Approvals</CardTitle>
                {selectedFiles.length > 0 && (
                  <Button onClick={bulkApproveFiles}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Selected ({selectedFiles.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pendingFiles.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-slate-600">No files pending approval</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedFiles.length === pendingFiles.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFiles(pendingFiles.map((f) => f._id))
                              } else {
                                setSelectedFiles([])
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Upload Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingFiles.map((file) => (
                        <TableRow key={file._id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedFiles.includes(file._id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedFiles((prev) => [...prev, file._id])
                                } else {
                                  setSelectedFiles((prev) => prev.filter((id) => id !== file._id))
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{file.originalName}</p>
                              {file.description && <p className="text-sm text-slate-500">{file.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{file.uploadedBy.name}</p>
                              <p className="text-sm text-slate-500">{file.department}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{file.category}</Badge>
                          </TableCell>
                          <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                          <TableCell>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {stats && (
              <>
                {/* System Overview Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>File Types Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          documents: { label: "Documents", color: "hsl(var(--chart-1))" },
                          images: { label: "Images", color: "hsl(var(--chart-2))" },
                          videos: { label: "Videos", color: "hsl(var(--chart-3))" },
                          other: { label: "Other", color: "hsl(var(--chart-4))" },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Documents",
                                  value: Math.floor(stats.totalFiles * 0.4),
                                  fill: "var(--color-documents)",
                                },
                                {
                                  name: "Images",
                                  value: Math.floor(stats.totalFiles * 0.3),
                                  fill: "var(--color-images)",
                                },
                                {
                                  name: "Videos",
                                  value: Math.floor(stats.totalFiles * 0.2),
                                  fill: "var(--color-videos)",
                                },
                                {
                                  name: "Other",
                                  value: Math.floor(stats.totalFiles * 0.1),
                                  fill: "var(--color-other)",
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Activity (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          uploads: { label: "Uploads", color: "hsl(var(--chart-1))" },
                          downloads: { label: "Downloads", color: "hsl(var(--chart-2))" },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { day: "Mon", uploads: 12, downloads: 45 },
                              { day: "Tue", uploads: 19, downloads: 52 },
                              { day: "Wed", uploads: 15, downloads: 38 },
                              { day: "Thu", uploads: 22, downloads: 61 },
                              { day: "Fri", uploads: 28, downloads: 73 },
                              { day: "Sat", uploads: 8, downloads: 25 },
                              { day: "Sun", uploads: 5, downloads: 18 },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="uploads" fill="var(--color-uploads)" />
                            <Bar dataKey="downloads" fill="var(--color-downloads)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Storage Usage Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          storage: { label: "Storage (GB)", color: "hsl(var(--chart-3))" },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={[
                              { month: "Jan", storage: 2.1 },
                              { month: "Feb", storage: 2.8 },
                              { month: "Mar", storage: 3.2 },
                              { month: "Apr", storage: 4.1 },
                              { month: "May", storage: 4.9 },
                              { month: "Jun", storage: 5.7 },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line type="monotone" dataKey="storage" stroke="var(--color-storage)" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Active Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Current Active Users</span>
                          <Badge variant="default" className="text-lg px-3 py-1">
                            {stats.activeUsers}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Admin Sessions</span>
                            <span>{Math.floor(stats.activeUsers * 0.1)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Manager Sessions</span>
                            <span>{Math.floor(stats.activeUsers * 0.2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>User Sessions</span>
                            <span>{Math.floor(stats.activeUsers * 0.7)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser((prev) => prev && { ...prev, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser((prev) => prev && { ...prev, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser((prev) => prev && { ...prev, department: e.target.value })}
                />
              </div>
              <Button
                onClick={() =>
                  updateUser(editingUser._id, {
                    name: editingUser.name,
                    role: editingUser.role,
                    department: editingUser.department,
                  })
                }
                className="w-full"
              >
                Update User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name || 'Admin'}</h1>
        <p className="text-muted-foreground">
          It is time to review the dashboard.
        </p>
      </div>
    </div>
  )
}
