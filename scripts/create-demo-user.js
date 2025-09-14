// scripts/create-demo-user.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const createDemoUser = async () => {
  // Try different connection strings based on environment
  const connectionStrings = [
    'mongodb://localhost:27017/file-tracking-e2e', // E2E test database
    'mongodb://localhost:27017/file-tracking-dev',
    'mongodb://localhost:27017/test-file-tracking',
    'mongodb://filetrackinguser:filetrackingpassword@localhost:27017/file-tracking-e2e'
  ];

  let client;
  let connected = false;

  for (const uri of connectionStrings) {
    try {
      console.log(`Trying connection: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
      client = new MongoClient(uri);
      await client.connect();
      console.log('✅ Connected to MongoDB');
      connected = true;
      break;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      if (client) {
        try { await client.close(); } catch {}
      }
    }
  }

  if (!connected) {
    console.error('❌ Could not connect to MongoDB with any connection string');
    console.log('💡 Make sure MongoDB is running: docker compose up -d');
    process.exit(1);
  }

  try {
    const db = client.db();
    const usersCollection = db.collection('users');

    const adminEmail = 'admin@filetracking.com';
    const adminPassword = 'admin123';

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: adminEmail });
    
    if (existingUser) {
      console.log('ℹ️ Demo admin user already exists');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create user
    const newUser = {
      name: 'Demo Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      department: 'IT',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await usersCollection.insertOne(newUser);
    console.log('✅ Demo admin user created successfully');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`🗄️ Database: ${db.databaseName}`);

  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
};

createDemoUser();
