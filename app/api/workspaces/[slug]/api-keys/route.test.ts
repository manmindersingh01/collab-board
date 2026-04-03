import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { GET, POST } from "./route";

const mockUser = { id: "user1", name: "Test", email: "t@t.com", clerkId: "c1", avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
const mockWorkspace = {
  id: "ws1", name: "Workspace", slug: "ws-1", logoUrl: null,
  plan: "FREE", stripeCustomerId: null, stripeSubscriptionId: null,
  createdAt: new Date(), updatedAt: new Date(),
  members: [{ role: "ADMIN" }],
};
const params = Promise.resolve({ slug: "ws-1" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/workspaces/[slug]/api-keys", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when workspace not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
      ...mockWorkspace,
      members: [{ role: "MEMBER" }],
    } as never);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(403);
  });

  it("returns api keys list without raw keys", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as never);
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue([
      {
        id: "k1", name: "CI Key", keyPrefix: "cb_live_",
        lastUsedAt: null, expiresAt: null, isRevoked: false,
        createdAt: new Date(), createdBy: { id: "user1", name: "Test" },
      },
    ] as never);

    const res = await GET(mockRequest("GET"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].keyPrefix).toBe("cb_live_");
    // Must NOT contain the raw key
    expect(body[0].key).toBeUndefined();
    expect(body[0].keyHash).toBeUndefined();
  });
});

describe("POST /api/workspaces/[slug]/api-keys", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await POST(mockRequest("POST", { name: "test" }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
      ...mockWorkspace,
      members: [{ role: "MEMBER" }],
    } as never);
    const res = await POST(mockRequest("POST", { name: "test" }), { params });
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as never);
    const res = await POST(mockRequest("POST", {}), { params });
    expect(res.status).toBe(400);
  });

  it("creates api key and returns raw key", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as never);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: "k1",
      name: "CI Key",
      keyHash: "hash",
      keyPrefix: "cb_live_",
      workspaceId: "ws1",
      createdById: "user1",
      expiresAt: null,
      isRevoked: false,
      lastUsedAt: null,
      createdAt: new Date(),
    });

    const res = await POST(mockRequest("POST", { name: "CI Key" }), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.key).toMatch(/^cb_live_/);
    expect(body.name).toBe("CI Key");
    expect(body.id).toBe("k1");
  });
});
