const { MongoMemoryServer } = require("mongodb-memory-server")
const { MongoClient } = require("mongodb")

let mongod
let mongoClient

beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()

  // Update environment variable
  process.env.MONGODB_URI = uri

  // Connect to the database
  mongoClient = new MongoClient(uri)
  await mongoClient.connect()
})

afterAll(async () => {
  // Clean up
  if (mongoClient) {
    await mongoClient.close()
  }
  if (mongod) {
    await mongod.stop()
  }
})

beforeEach(async () => {
  // Clean database before each test
  const db = mongoClient.db()
  const collections = await db.listCollections().toArray()

  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({})
  }
})
