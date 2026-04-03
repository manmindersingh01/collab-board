import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { POST } from "./route";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockUser = { id: "user1", name: "Test", email: "t@t.com", clerkId: "c1", avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
const mockBoard = {
  id: "b1", name: "Board", ownerId: "user1",
  members: [{ role: "owner" }],
};
const params = Promise.resolve({ id: "b1", webhookId: "wh1" });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/boards/[id]/webhooks/[webhookId]/test", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await POST(mockRequest("POST"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when not owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({
      ...mockBoard, members: [{ role: "viewer" }],
    } as never);
    const res = await POST(mockRequest("POST"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when webhook not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    vi.mocked(prisma.webhookEndpoint.findUnique).mockResolvedValue(null);
    const res = await POST(mockRequest("POST"), { params });
    expect(res.status).toBe(404);
  });

  it("sends test webhook and returns success", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    vi.mocked(prisma.webhookEndpoint.findUnique).mockResolvedValue({
      id: "wh1", url: "https://example.com/hook", secret: "secret123", boardId: "b1",
    } as never);
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const res = await POST(mockRequest("POST"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles fetch failure gracefully", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    vi.mocked(prisma.webhookEndpoint.findUnique).mockResolvedValue({
      id: "wh1", url: "https://example.com/hook", secret: "secret123", boardId: "b1",
    } as never);
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const res = await POST(mockRequest("POST"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Connection refused/);
  });
});
