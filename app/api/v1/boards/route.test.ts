import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { GET } from "./route";

// Mock the v1 auth helpers
vi.mock("@/lib/api-keys/middleware", () => ({
  authenticateApiKey: vi.fn(),
}));
vi.mock("@/lib/api-keys/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

import { authenticateApiKey } from "@/lib/api-keys/middleware";
import { checkRateLimit } from "@/lib/api-keys/rate-limit";

const validAuth = {
  authenticated: true,
  workspaceId: "ws1",
  userId: "user1",
  keyHash: "hash123",
};

const rateLimitOk = {
  allowed: true,
  remaining: 55,
  resetAt: new Date("2026-01-01T00:01:00Z"),
};

function apiRequest(method = "GET") {
  return new Request("http://localhost:3000/api/v1/boards", {
    method,
    headers: { Authorization: "Bearer cb_live_abc123", "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/boards", () => {
  it("returns 401 with no API key", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({
      authenticated: false,
      error: "Invalid API key",
    });
    const res = await GET(new Request("http://localhost:3000/api/v1/boards"));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: new Date() });

    const res = await GET(apiRequest());
    expect(res.status).toBe(429);
  });

  it("returns boards for authenticated API key", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rateLimitOk);
    vi.mocked(prisma.board.findMany).mockResolvedValue([
      { id: "b1", name: "Board 1", description: null, createdAt: new Date(), updatedAt: new Date(), _count: { members: 2, list: 3 } },
    ] as never);

    const res = await GET(apiRequest());
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Board 1");
    expect(body.meta.rateLimit.remaining).toBe(55);
  });
});
