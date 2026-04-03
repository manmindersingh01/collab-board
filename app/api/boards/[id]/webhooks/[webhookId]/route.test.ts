import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { DELETE } from "./route";

const mockUser = { id: "user1", name: "Test", email: "t@t.com", clerkId: "c1", avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
const mockBoard = {
  id: "b1", name: "Board", ownerId: "user1",
  members: [{ role: "owner" }],
};
const params = Promise.resolve({ id: "b1", webhookId: "wh1" });

beforeEach(() => vi.clearAllMocks());

describe("DELETE /api/boards/[id]/webhooks/[webhookId]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({
      ...mockBoard, members: [{ role: "editer" }],
    } as never);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when webhook not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    vi.mocked(prisma.webhookEndpoint.findUnique).mockResolvedValue(null);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 404 when webhook belongs to different board", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    vi.mocked(prisma.webhookEndpoint.findUnique).mockResolvedValue({
      id: "wh1", boardId: "other-board",
    } as never);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("deletes webhook on success", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    vi.mocked(prisma.webhookEndpoint.findUnique).mockResolvedValue({
      id: "wh1", boardId: "b1",
    } as never);
    vi.mocked(prisma.webhookEndpoint.delete).mockResolvedValue({} as never);

    const res = await DELETE(mockRequest("DELETE"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(prisma.webhookEndpoint.delete).toHaveBeenCalledWith({ where: { id: "wh1" } });
  });
});
