import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Users, Shield, Search, Bell, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Digital File Tracking</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Professional File Management
            <span className="block text-blue-600">Made Simple</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
            Streamline your document workflow with enterprise-grade file tracking, role-based access control, and
            comprehensive audit trails.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" asChild>
              <Link href="/dashboard">View Dashboard</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent" asChild>
              <Link href="/demo">Try Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-slate-900 dark:text-slate-100 mb-12">
            Everything You Need for File Management
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Role-Based Access</CardTitle>
                <CardDescription>
                  Secure file access with granular permissions for admins, managers, and users.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <Search className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Advanced Search</CardTitle>
                <CardDescription>
                  Find files instantly with powerful search across names, tags, and metadata.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>
                  Complete history of all file actions with detailed logging and reporting.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <Bell className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle>Smart Notifications</CardTitle>
                <CardDescription>
                  Stay informed with automated alerts for approvals, updates, and deadlines.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <Users className="h-12 w-12 text-red-600 mb-4" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>Share files securely across departments with approval workflows.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <FileText className="h-12 w-12 text-teal-600 mb-4" />
                <CardTitle>Version Control</CardTitle>
                <CardDescription>Track file versions with automatic backup and rollback capabilities.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 dark:bg-slate-800">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">Ready to Transform Your File Management?</h3>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of organizations using our platform to streamline their document workflows.
          </p>
          <Button size="lg" className="text-lg px-8 bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/register">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-100 dark:bg-slate-900 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            © 2024 Digital File Tracking System. Built with Next.js and MongoDB.
          </p>
        </div>
      </footer>
    </div>
  )
}
