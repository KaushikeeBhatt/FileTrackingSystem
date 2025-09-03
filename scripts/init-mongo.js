// Initialize database and create user
const dbName = 'file-tracking-dev';

// Wait for MongoDB to be ready
let attempt = 0;
const maxAttempts = 5;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function initialize() {
  try {
    // Authenticate with the admin database first
    const adminDb = db.getSiblingDB('admin');
    adminDb.auth('admin', 'password');
    print('Successfully authenticated with admin database');

    // Switch to the application database
    const appDb = db.getSiblingDB(dbName);
    print(`Using database: ${dbName}`);

    // Create application user in the application database
    try {
      appDb.createUser({
        user: 'filetrackinguser',
        pwd: 'filetrackingpassword',
        roles: [
          { role: 'readWrite', db: dbName },
          { role: 'dbAdmin', db: dbName }
        ]
      });
      print('User created successfully');
    } catch (e) {
      if (e.codeName === 'DuplicateKey') {
        print('User already exists, skipping creation');
      } else {
        throw e;
      }
    }

    // Create collections and indexes
    const collections = {
      users: [
        { keys: { email: 1 }, options: { unique: true } },
        { keys: { role: 1 }, options: {} }
      ],
      files: [
        { keys: { owner: 1 }, options: {} },
        { keys: { status: 1 }, options: {} },
        { keys: { uploadDate: -1 }, options: {} },
        { keys: { filename: 'text', description: 'text' }, options: { weights: { filename: 10, description: 5 } } }
      ],
      auditLogs: [
        { keys: { userId: 1 }, options: {} },
        { keys: { timestamp: -1 }, options: {} },
        { keys: { action: 1 }, options: {} }
      ],
      notifications: [
        { keys: { userId: 1 }, options: {} },
        { keys: { read: 1 }, options: {} },
        { keys: { createdAt: -1 }, options: {} }
      ],
      fileShares: [
        { keys: { fileId: 1, userId: 1 }, options: { unique: true } },
        { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } }
      ]
    };

    for (const [collectionName, indexes] of Object.entries(collections)) {
      if (!appDb.getCollectionNames().includes(collectionName)) {
        appDb.createCollection(collectionName);
        print(`Created collection: ${collectionName}`);
      }
      const collection = appDb.getCollection(collectionName);
      for (const { keys, options } of indexes) {
        collection.createIndex(keys, options);
        print(`Created index on ${collectionName} for keys: ${JSON.stringify(keys)}`);
      }
    }

    // Add initial admin user if not exists
    const adminUser = appDb.getCollection('users').findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      appDb.getCollection('users').insertOne({
        email: 'admin@example.com',
        password: 'adminpassword', // This should be hashed in a real app
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      print('Created initial admin user');
    }

    // Add initial manager user if not exists
    const managerUser = appDb.getCollection('users').findOne({ email: 'manager@example.com' });
    if (!managerUser) {
      const hashedPassword = await bcrypt.hash('managerpassword', 12);
      await appDb.getCollection('users').insertOne({
        email: 'manager@example.com',
        password: hashedPassword,
        name: 'Manager User',
        role: 'manager',
        department: 'Management',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      print('Created initial manager user');
    }

    print('Database initialization completed successfully');
    return true;

  } catch (error) {
    print(`Error during initialization: ${error}`);
    throw error;
  }
}

// Retry mechanism for MongoDB connection
async function runWithRetry() {
  while (attempt < maxAttempts) {
    try {
      print(`Attempt ${attempt + 1} of ${maxAttempts}`);
      if (await initialize()) {
        break;
      }
    } catch (error) {
      attempt++;
      if (attempt === maxAttempts) {
        print('Max attempts reached, giving up');
        quit(1);
      }
      print(`Retrying in 5 seconds...`);
      await wait(5000);
    }
  }
}

runWithRetry();
