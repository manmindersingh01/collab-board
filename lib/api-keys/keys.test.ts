import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { generateApiKey, hashApiKey, validateApiKey } from "./keys";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateApiKey", () => {
  it("returns raw key starting with cb_live_", () => {
    const { raw } = generateApiKey();
    expect(raw).toMatch(/^cb_live_[a-f0-9]{32}$/);
  });

  it("returns a hash that differs from raw", () => {
    const { raw, hash } = generateApiKey();
    expect(hash).not.toBe(raw);
  });

  it("returns prefix as first 8 chars of raw", () => {
    const { raw, prefix } = generateApiKey();
    expect(prefix).toBe(raw.slice(0, 8));
  });

  it("generates unique keys on each call", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashApiKey", () => {
  it("is deterministic (same input = same hash)", () => {
    const key = "cb_live_abc123";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("returns a 64-char hex string (SHA-256)", () => {
    expect(hashApiKey("test")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("different inputs produce different hashes", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});

describe("validateApiKey", () => {
  it("returns valid with workspace for a good key", async () => {
    const { raw, hash } = generateApiKey();
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key1",
      keyHash: hash,
      keyPrefix: raw.slice(0, 8),
      name: "Test",
      workspaceId: "ws1",
      createdById: "user1",
      isRevoked: false,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    });

    const result = await validateApiKey(raw);
    expect(result).toEqual({ valid: true, workspaceId: "ws1", userId: "user1" });
  });

  it("returns invalid for nonexistent key", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);
    const result = await validateApiKey("cb_live_nonexistent0000000000000000");
    expect(result).toEqual({ valid: false });
  });

  it("returns invalid for revoked key", async () => {
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

    const result = await validateApiKey("cb_live_whatever00000000000000000000");
    expect(result).toEqual({ valid: false });
  });

  it("returns invalid for expired key", async () => {
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

    const result = await validateApiKey("cb_live_whatever00000000000000000000");
    expect(result).toEqual({ valid: false });
  });
});
