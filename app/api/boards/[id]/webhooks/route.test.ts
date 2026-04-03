import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { GET, POST } from "./route";

const mockUser = { id: "user1", name: "Test", email: "t@t.com", clerkId: "c1", avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
const mockBoard = {
  id: "b1", name: "Board", ownerId: "user1", workspaceId: "ws1",
  description: null, isArchived: false, createdAt: new Date(), updatedAt: new Date(),
  members: [{ role: "owner" }],
};
const params = Promise.resolve({ id: "b1" });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/boards/[id]/webhooks", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when board not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(null);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({
      ...mockBoard, members: [{ role: "editer" }],
    } as never);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(403);
  });

  it("returns webhook list on success", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    vi.mocked(prisma.webhookEndpoint.findMany).mockResolvedValue([
      { id: "wh1", url: "https://example.com/hook", events: ["card.created"], isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ] as never);

    const res = await GET(mockRequest("GET"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].url).toBe("https://example.com/hook");
    // Secret should NOT be exposed in list
    expect(body[0].secret).toBeUndefined();
  });
});

describe("POST /api/boards/[id]/webhooks", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await POST(mockRequest("POST", { url: "https://x.com/h", events: ["card.created"] }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({
      ...mockBoard, members: [{ role: "viewer" }],
    } as never);
    const res = await POST(mockRequest("POST", { url: "https://x.com/h", events: ["card.created"] }), { params });
    expect(res.status).toBe(403);
  });

  it("returns 400 when url missing", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    const res = await POST(mockRequest("POST", { events: ["card.created"] }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when events empty", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    const res = await POST(mockRequest("POST", { url: "https://x.com/h", events: [] }), { params });
    expect(res.status).toBe(400);
  });

  it("creates webhook and returns secret", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);
    vi.mocked(prisma.webhookEndpoint.create).mockResolvedValue({
      id: "wh1", url: "https://example.com/hook", events: ["card.created"],
      secret: "generated-secret", isActive: true, boardId: "b1",
      createdById: "user1", createdAt: new Date(), updatedAt: new Date(),
    });

    const res = await POST(
      mockRequest("POST", { url: "https://example.com/hook", events: ["card.created"] }),
      { params },
    );
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.url).toBe("https://example.com/hook");
    expect(body.secret).toBeDefined();
  });
});
