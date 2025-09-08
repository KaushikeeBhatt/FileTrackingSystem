import { NextRequest } from "next/server";
import { GET as healthHandler } from "@/app/api/health/route";
import { setupTestDatabase, getTestDb, cleanTestDb } from "../utils/test-helpers";

// Mock the mongodb module to ensure health check passes
jest.mock('@/lib/mongodb', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    admin: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue(true)
    }),
    collection: jest.fn().mockReturnValue({
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
      findOne: jest.fn().mockResolvedValue(null)
    })
  })
}));

describe("/api/health", () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const response = await healthHandler();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      console.log('Health API response data:', data);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('database', 'connected');
    });

    it("should include database connection status", async () => {
      const req = new NextRequest("http://localhost:3000/api/health");

      const response = await healthHandler();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('database', 'connected');
      expect(data).toHaveProperty('uptime');
    });

    it("should include system information", async () => {
      const req = new NextRequest("http://localhost:3000/api/health");

      const response = await healthHandler();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');
    });
  });
});
