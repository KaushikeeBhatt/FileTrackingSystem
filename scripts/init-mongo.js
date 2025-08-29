const db = db.getSiblingDB("file-tracking-dev")

db.createUser({
  user: "filetrackinguser",
  pwd: "filetrackingpassword",
  roles: [{ role: "readWrite", db: "file-tracking-dev" }],
})

// Create collections with proper indexes
db.createCollection("users")
db.createCollection("files")
db.createCollection("auditLogs")
db.createCollection("notifications")
db.createCollection("fileShares")

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })

db.files.createIndex({ owner: 1 })
db.files.createIndex({ status: 1 })
db.files.createIndex({ uploadDate: -1 })
db.files.createIndex({ filename: "text", description: "text" })

db.auditLogs.createIndex({ userId: 1 })
db.auditLogs.createIndex({ timestamp: -1 })
db.auditLogs.createIndex({ action: 1 })

db.notifications.createIndex({ userId: 1 })
db.notifications.createIndex({ read: 1 })
db.notifications.createIndex({ createdAt: -1 })

db.fileShares.createIndex({ fileId: 1 })
db.fileShares.createIndex({ sharedWith: 1 })
db.fileShares.createIndex({ expiresAt: 1 })

print("Database initialized successfully with collections and indexes")
