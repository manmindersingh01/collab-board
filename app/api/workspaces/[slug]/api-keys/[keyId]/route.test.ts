import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { DELETE } from "./route";

const mockUser = { id: "user1", name: "Test", email: "t@t.com", clerkId: "c1", avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
const mockWorkspace = {
  id: "ws1", name: "Workspace", slug: "ws-1", logoUrl: null,
  plan: "FREE", stripeCustomerId: null, stripeSubscriptionId: null,
  createdAt: new Date(), updatedAt: new Date(),
  members: [{ role: "ADMIN" }],
};
const params = Promise.resolve({ slug: "ws-1", keyId: "key1" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/workspaces/[slug]/api-keys/[keyId]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
      ...mockWorkspace,
      members: [{ role: "MEMBER" }],
    } as never);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when key not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as never);
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 404 when key belongs to different workspace", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as never);
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key1",
      workspaceId: "other-ws",
      keyHash: "h",
      keyPrefix: "cb_live_",
      name: "k",
      createdById: "user1",
      isRevoked: false,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    });
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("revokes the api key on success", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as never);
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key1",
      workspaceId: "ws1",
      keyHash: "h",
      keyPrefix: "cb_live_",
      name: "k",
      createdById: "user1",
      isRevoked: false,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);

    const res = await DELETE(mockRequest("DELETE"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(prisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isRevoked: true } }),
    );
  });
});
