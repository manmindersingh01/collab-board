import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { authenticateApiKey } from "./middleware";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;
  return new Request("http://localhost:3000/api/v1/boards", { headers });
}

describe("authenticateApiKey", () => {
  it("returns error when no Authorization header", async () => {
    const result = await authenticateApiKey(makeRequest());
    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/Missing/);
  });

  it("returns error for non-Bearer auth", async () => {
    const result = await authenticateApiKey(makeRequest("Basic abc123"));
    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/Missing/);
  });

  it("returns error for invalid key format", async () => {
    const result = await authenticateApiKey(makeRequest("Bearer invalid_key"));
    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/format/);
  });

  it("returns error when key not found in DB", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);
    const result = await authenticateApiKey(
      makeRequest("Bearer cb_live_aaaabbbbccccddddeeeeffffggg00000"),
    );
    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/Invalid API key/);
  });

  it("returns error for revoked key", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key1",
      keyHash: "h",
      keyPrefix: "cb_live_",
      name: "Test",
      workspaceId: "ws1",
      createdById: "user1",
      isRevoked: true,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    });
    const result = await authenticateApiKey(
      makeRequest("Bearer cb_live_aaaabbbbccccddddeeeeffffggg00000"),
    );
    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/revoked/);
  });

  it("returns error for expired key", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key1",
      keyHash: "h",
      keyPrefix: "cb_live_",
      name: "Test",
      workspaceId: "ws1",
      createdById: "user1",
      isRevoked: false,
      expiresAt: new Date("2020-01-01"),
      lastUsedAt: null,
      createdAt: new Date(),
    });
    const result = await authenticateApiKey(
      makeRequest("Bearer cb_live_aaaabbbbccccddddeeeeffffggg00000"),
    );
    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/expired/);
  });

  it("returns authenticated with workspace for valid key", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key1",
      keyHash: "h",
      keyPrefix: "cb_live_",
      name: "Test",
      workspaceId: "ws1",
      createdById: "user1",
      isRevoked: false,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);

    const result = await authenticateApiKey(
      makeRequest("Bearer cb_live_aaaabbbbccccddddeeeeffffggg00000"),
    );
    expect(result.authenticated).toBe(true);
    expect(result.workspaceId).toBe("ws1");
    expect(result.userId).toBe("user1");
    expect(result.keyHash).toBeDefined();
  });
});
