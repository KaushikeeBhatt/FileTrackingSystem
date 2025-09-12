import { NextRequest } from "next/server";

// Import API routes - these are the wrapped handlers with middleware
import { POST as advancedSearchHandler } from "@/app/api/search/advanced/route";
import { POST as saveSearchHandler } from "@/app/api/search/save/route";
import { GET as savedSearchesHandler, DELETE as deleteSavedSearchHandler } from "@/app/api/search/saved/route";
import { GET as searchSuggestionsHandler } from "@/app/api/search/suggestions/route";
import { setupTestDatabase, getTestDb, cleanTestDb, createTestUser } from "../utils/test-helpers";

describe("/api/search", () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe("POST /api/search/advanced", () => {
    it("should perform advanced search with all filters", async () => {
      const searchFilters = {
        query: "test document",
        category: "documents",
        department: "engineering",
        fileType: "pdf",
        dateFrom: "2023-01-01",
        dateTo: "2023-12-31",
        tags: ["important", "review"],
        size: { min: 1024, max: 10485760 },
        page: 1,
        limit: 50
      };

      const req = new NextRequest("http://localhost:3000/api/search/advanced", {
        method: "POST",
        body: JSON.stringify(searchFilters),
        headers: {
          "Content-Type": "application/json"
        }
      });

      // The middleware mock will automatically add user context
      const response = await advancedSearchHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.results)).toBe(true);
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('facets');
    });

    it("should perform basic text search", async () => {
      const searchFilters = {
        query: "test"
      };

      const req = new NextRequest("http://localhost:3000/api/search/advanced", {
        method: "POST",
        body: JSON.stringify(searchFilters),
        headers: {
          "Content-Type": "application/json"
        }
      });

      // The middleware mock will automatically add user context
      const response = await advancedSearchHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it("should validate search parameters", async () => {
      const req = new NextRequest("http://localhost:3000/api/search/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(null), // Invalid filters - null instead of object
      });

      // The middleware mock will automatically add user context
      const response = await advancedSearchHandler(req);
      const data = await response.json();

      expect([400, 500]).toContain(response.status);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });

    it("should handle date range validation", async () => {
      const req = new NextRequest("http://localhost:3000/api/search/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          dateFrom: "2024-12-31",
          dateTo: "2024-01-01" // End before start
        }),
      });

      // The middleware mock will automatically add user context
      const response = await advancedSearchHandler(req);
      const data = await response.json();

      expect([400, 500]).toContain(response.status);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      if (response.status === 400) {
        expect(data.error).toContain('date');
      }
    });
  });

  describe("POST /api/search/save", () => {
    it("should save search query", async () => {
      const req = new NextRequest("http://localhost:3000/api/search/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchQuery: "important documents",
          filters: {
            fileTypes: ["pdf"],
            tags: ["work"]
          }
        }),
      });

      // The middleware mock will automatically add user context
      const response = await saveSearchHandler(req);
      const data = await response.json();

      expect([200, 201]).toContain(response.status);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message');
    });

    it("should validate required fields for saving search", async () => {
      const req = new NextRequest("http://localhost:3000/api/search/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchQuery: "", // Empty searchQuery should trigger validation
          filters: {}
        }),
      });

      // The middleware mock will automatically add user context
      const response = await saveSearchHandler(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });

  describe("GET /api/search/saved", () => {
    it("should list user's saved searches", async () => {
      const req = new NextRequest("http://localhost:3000/api/search/saved");

      // The middleware mock will automatically add user context
      const response = await savedSearchesHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data.searches).toBeDefined();
      expect(Array.isArray(data.searches)).toBe(true);
    });
  });

  describe("DELETE /api/search/saved", () => {
    it("should delete saved search", async () => {
      const req = new NextRequest("http://localhost:3000/api/search/saved?id=test-search-id", {
        method: "DELETE"
      });

      // The middleware mock will automatically add user context
      const response = await deleteSavedSearchHandler(req);
      const data = await response.json();

      // Should return 404 for non-existent search or 200 for successful deletion
      expect([200, 404]).toContain(response.status);
    });

    it("should require search ID for deletion", async () => {
      const req = new NextRequest("http://localhost:3000/api/search/saved", {
        method: "DELETE"
      });

      // The middleware mock will automatically add user context
      const response = await deleteSavedSearchHandler(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('ID');
    });
  });

  describe("GET /api/search/suggestions", () => {
    it("should provide search suggestions", async () => {
      const url = new URL("http://localhost:3000/api/search/suggestions");
      url.searchParams.set('q', 'test');
      
      const req = new NextRequest(url);

      // The middleware mock will automatically add user context
      const response = await searchSuggestionsHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
    });

    it("should handle empty query for suggestions", async () => {
      const req = new NextRequest("http://localhost:3000/api/search/suggestions");

      // The middleware mock will automatically add user context
      const response = await searchSuggestionsHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.suggestions.length).toBe(0);
    });

    it("should limit number of suggestions", async () => {
      const url = new URL("http://localhost:3000/api/search/suggestions");
      url.searchParams.set('q', 'test');
      url.searchParams.set('limit', '5');
      
      const req = new NextRequest(url);

      // The middleware mock will automatically add user context
      const response = await searchSuggestionsHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data.suggestions).toBeDefined();
      expect(data.suggestions.length).toBeLessThanOrEqual(5);
    });
  });
});
