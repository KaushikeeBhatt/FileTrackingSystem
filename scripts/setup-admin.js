// scripts/setup-admin.js
import { UserOperations } from "../lib/user-operations.ts"
import { closeDatabaseConnection } from "../lib/mongodb.ts"
import { AuthService } from "../lib/auth.ts"

const setupAdmin = async () => {
  try {
    const adminEmail = "priyanka@filetracking.com" // custom email
    const adminPassword = "kaushikee"              // custom password

    console.log(`Checking for admin user: ${adminEmail}`)
    const adminExists = await UserOperations.getUserByEmail(adminEmail)

    if (!adminExists) {
      console.log("Admin user not found, creating new one...")
      const hashedPassword = await AuthService.hashPassword(adminPassword)
      await UserOperations.createUser({
        name: "Priyanka",            // custom name
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        isVerified: true,
        department: "IT",
      })
      console.log("✅ Admin user created successfully")
    } else {
      console.log("ℹ️ Admin user already exists")
    }
  } catch (error) {
    console.error("❌ Error setting up admin user:", error)
    process.exit(1)
  } finally {
    await closeDatabaseConnection()
  }
}

setupAdmin()
