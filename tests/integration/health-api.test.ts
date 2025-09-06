import { NextRequest } from "next/server";
import { GET as healthHandler } from "@/app/api/health/route";
import { setupTestDatabase, getTestDb, cleanTestDb } from "../utils/test-helpers";

describe("/api/health", () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const req = new NextRequest("http://localhost:3000/api/health");

      const response = await healthHandler();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.database).toBe('connected');
    });

    it("should include database connection status", async () => {
      const req = new NextRequest("http://localhost:3000/api/health");

      const response = await healthHandler();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.database).toBe('connected');
      expect(data.uptime).toBeDefined();
    });

    it("should include system information", async () => {
      const req = new NextRequest("http://localhost:3000/api/health");

      const response = await healthHandler();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.version).toBeDefined();
      expect(data.uptime).toBeDefined();
    });
  });
});
