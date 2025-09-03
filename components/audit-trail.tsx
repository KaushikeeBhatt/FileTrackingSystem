"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  Filter,
  CalendarIcon,
  Activity,
  CheckCircle,
  XCircle,
  User,
  File,
  Shield,
  BarChart3,
} from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"

interface AuditLog {
  _id: string
  action: string
  resourceType: string
  resourceId: string
  timestamp: string
  success: boolean
  errorMessage?: string
  user: {
    _id: string
    name: string
    email: string
    role: string
    department: string
  }
  resource?: {
    originalName: string
    fileName: string
    category: string
  }
  details: any
}

interface AuditStats {
  totalActions: number
  successfulActions: number
  failedActions: number
  uniqueUsers: number
  actionBreakdown: { action: string; count: number }[]
  dailyActivity: { date: string; count: number }[]
  topUsers: { user: string; count: number }[]
}

export function AuditTrail() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [filters, setFilters] = useState({
    userId: "",
    action: "all",
    resourceType: "all",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    success: "all",
  })

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          if (value instanceof Date) {
            params.append(key, value.toISOString())
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/audit/logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
        setTotal(data.total)
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchAuditStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.append("dateTo", filters.dateTo.toISOString())

      const response = await fetch(`/api/audit/stats?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch audit stats:", error)
    }
  }, [filters])

  useEffect(() => {
    fetchAuditLogs()
    fetchAuditStats()
  }, [fetchAuditLogs, fetchAuditStats, filters])

  const exportReport = async (format: "csv" | "json") => {
    try {
      const params = new URLSearchParams()
      params.append("format", format)

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          if (value instanceof Date) {
            params.append(key, value.toISOString())
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/audit/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `audit-report-${new Date().toISOString().split("T")[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const getActionIcon = (action: string) => {
    const icons = {
      upload: File,
      download: Download,
      delete: XCircle,
      approve: CheckCircle,
      login: User,
      register: User,
      view: Activity,
      edit: Activity,
      share: Activity,
    }
    const Icon = icons[action as keyof typeof icons] || Activity
    return <Icon className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    const colors = {
      upload: "text-blue-600",
      download: "text-green-600",
      delete: "text-red-600",
      approve: "text-emerald-600",
      login: "text-purple-600",
      register: "text-indigo-600",
      view: "text-slate-600",
      edit: "text-orange-600",
      share: "text-teal-600",
    }
    return colors[action as keyof typeof colors] || "text-slate-600"
  }

  if (loading && logs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading audit trail...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Audit Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={filters.action}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, action: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                      <SelectItem value="download">Download</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="approve">Approve</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Resource Type</Label>
                  <Select
                    value={filters.resourceType}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, resourceType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="file">Files</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.success}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, success: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="true">Success</SelectItem>
                      <SelectItem value="false">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters((prev) => ({ ...prev, dateFrom: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters((prev) => ({ ...prev, dateTo: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={() => exportReport("csv")} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button onClick={() => exportReport("json")} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Audit Trail
                </span>
                <Badge variant="secondary">{total} total entries</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">No audit logs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log._id}>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{format(new Date(log.timestamp), "MMM dd, yyyy")}</p>
                              <p className="text-slate-500">{format(new Date(log.timestamp), "HH:mm:ss")}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <p className="text-sm font-medium">{log.user.name}</p>
                                <p className="text-xs text-slate-500">{log.user.department}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-2 ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                              <span className="capitalize font-medium">{log.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {log.resourceType}
                              </Badge>
                              {log.resource && (
                                <p className="text-sm text-slate-600 truncate max-w-xs">{log.resource.originalName}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.success ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Success
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {log.details.ipAddress && <p className="text-slate-500">IP: {log.details.ipAddress}</p>}
                              {log.details.fileName && <p className="text-slate-600">File: {log.details.fileName}</p>}
                              {log.errorMessage && <p className="text-red-600">Error: {log.errorMessage}</p>}
                            </div>
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

        <TabsContent value="analytics" className="space-y-6">
          {stats && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.totalActions > 0 ? Math.round((stats.successfulActions / stats.totalActions) * 100) : 0}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.failedActions.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.uniqueUsers.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Action Breakdown</CardTitle>
                  <CardDescription>Most common actions in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.actionBreakdown.slice(0, 8).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getActionIcon(item.action)}
                          <span className="capitalize font-medium">{item.action}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(item.count / stats.actionBreakdown[0].count) * 100}%`,
                              }}
                            />
                          </div>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Users (Admin/Manager only) */}
              {(user?.role === "admin" || user?.role === "manager") && stats.topUsers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Most Active Users</CardTitle>
                    <CardDescription>Users with the most activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.topUsers.slice(0, 10).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{item.user}</span>
                          </div>
                          <Badge variant="secondary">{item.count} actions</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
