import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { GET } from "./route";

const mockUser = {
  id: "user1",
  name: "Test",
  email: "test@test.com",
  clerkId: "clerk1",
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/boards/[id]/integrations", () => {
  const params = Promise.resolve({ id: "board1" });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when user is not a board member", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(404);
  });

  it("returns integrations for authenticated member", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    });
    const mockIntegrations = [
      {
        id: "int1",
        type: "slack",
        config: { webhookUrl: "https://hooks.slack.com/x" },
        isActive: true,
        boardId: "board1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.mocked(prisma.integration.findMany).mockResolvedValue(mockIntegrations);

    const res = await GET(mockRequest("GET"), { params });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].type).toBe("slack");
  });

  it("returns empty array when no integrations exist", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "viewer",
      joinedAt: new Date(),
    });
    vi.mocked(prisma.integration.findMany).mockResolvedValue([]);

    const res = await GET(mockRequest("GET"), { params });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body).toEqual([]);
  });
});
