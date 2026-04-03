import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { POST, DELETE } from "./route";

const mockUser = {
  id: "user1",
  name: "Test",
  email: "test@test.com",
  clerkId: "clerk1",
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const VALID_WEBHOOK = "https://hooks.slack.com/services/T00000000/B00000000/abcdefghij";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/boards/[id]/integrations/slack", () => {
  const params = Promise.resolve({ id: "board1" });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await POST(
      mockRequest("POST", { webhookUrl: VALID_WEBHOOK }),
      { params },
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "editer",
      joinedAt: new Date(),
    });
    const res = await POST(
      mockRequest("POST", { webhookUrl: VALID_WEBHOOK }),
      { params },
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when user is not a member at all", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await POST(
      mockRequest("POST", { webhookUrl: VALID_WEBHOOK }),
      { params },
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid webhook URL", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    });
    const res = await POST(
      mockRequest("POST", { webhookUrl: "https://evil.com/webhook" }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing webhook URL", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    });
    const res = await POST(mockRequest("POST", {}), { params });
    expect(res.status).toBe(400);
  });

  it("creates Slack integration on success", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    });
    const mockIntegration = {
      id: "int1",
      type: "slack",
      config: { webhookUrl: VALID_WEBHOOK, channel: null },
      isActive: true,
      boardId: "board1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.integration.upsert).mockResolvedValue(mockIntegration);

    const res = await POST(
      mockRequest("POST", { webhookUrl: VALID_WEBHOOK }),
      { params },
    );
    const { status, body } = await parseResponse(res);

    expect(status).toBe(201);
    expect(body.type).toBe("slack");
    expect(prisma.integration.upsert).toHaveBeenCalled();
  });

  it("accepts optional channel parameter", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    });
    vi.mocked(prisma.integration.upsert).mockResolvedValue({
      id: "int1",
      type: "slack",
      config: { webhookUrl: VALID_WEBHOOK, channel: "#general" },
      isActive: true,
      boardId: "board1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(
      mockRequest("POST", { webhookUrl: VALID_WEBHOOK, channel: "#general" }),
      { params },
    );
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/boards/[id]/integrations/slack", () => {
  const params = Promise.resolve({ id: "board1" });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "viewer",
      joinedAt: new Date(),
    });
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when integration does not exist", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    });
    vi.mocked(prisma.integration.findUnique).mockResolvedValue(null);

    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("deletes integration on success", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    });
    vi.mocked(prisma.integration.findUnique).mockResolvedValue({
      id: "int1",
      type: "slack",
      config: {},
      isActive: true,
      boardId: "board1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.integration.delete).mockResolvedValue({
      id: "int1",
      type: "slack",
      config: {},
      isActive: true,
      boardId: "board1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await DELETE(mockRequest("DELETE"), { params });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(prisma.integration.delete).toHaveBeenCalled();
  });
});
