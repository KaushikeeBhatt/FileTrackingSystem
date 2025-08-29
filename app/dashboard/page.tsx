"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/file-upload"
import { FileList } from "@/components/file-list"
import { AuditTrail } from "@/components/audit-trail"
import { AdminDashboard } from "@/components/admin-dashboard"
import { NotificationCenter } from "@/components/notification-center"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Upload, List, LogOut, User, Shield, Settings } from "lucide-react"

export default function DashboardPage() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">File Tracking Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-slate-500 capitalize">({user.role})</span>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Welcome back, {user.name}!</CardTitle>
            <CardDescription>
              Manage your files, track uploads, and collaborate with your team.
              {user.department && ` Department: ${user.department}`}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="files" className="space-y-6">
          <TabsList className={`grid w-full ${user.role === "admin" ? "grid-cols-4" : "grid-cols-3"}`}>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              File Management
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
            {user.role === "admin" && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Admin Panel
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="files">
            <FileList refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="upload">
            <FileUpload onUploadComplete={handleUploadComplete} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrail />
          </TabsContent>

          {user.role === "admin" && (
            <TabsContent value="admin">
              <AdminDashboard />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
