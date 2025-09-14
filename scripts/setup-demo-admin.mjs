// scripts/setup-demo-admin.mjs
import { UserOperations } from "../lib/user-operations.ts"
import { closeDatabaseConnection } from "../lib/mongodb.ts"
import { AuthService } from "../lib/auth.ts"

const setupDemoAdmin = async () => {
  try {
    const adminEmail = "admin@filetracking.com"
    const adminPassword = "admin123"

    console.log(`Checking for demo admin user: ${adminEmail}`)
    const adminExists = await UserOperations.getUserByEmail(adminEmail)

    if (!adminExists) {
      console.log("Demo admin user not found, creating new one...")
      const hashedPassword = await AuthService.hashPassword(adminPassword)
      await UserOperations.createUser({
        name: "Demo Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        isVerified: true,
        department: "IT",
      })
      console.log("✅ Demo admin user created successfully")
    } else {
      console.log("ℹ️ Demo admin user already exists")
    }
  } catch (error) {
    console.error("❌ Error setting up demo admin user:", error)
    process.exit(1)
  } finally {
    await closeDatabaseConnection()
  }
}

setupDemoAdmin()
