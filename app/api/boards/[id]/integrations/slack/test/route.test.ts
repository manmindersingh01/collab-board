import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";

// Mock the slack module
vi.mock("@/lib/integrations/slack", () => ({
  sendSlackMessage: vi.fn(),
}));

import { sendSlackMessage } from "@/lib/integrations/slack";
import { POST } from "./route";

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

describe("POST /api/boards/[id]/integrations/slack/test", () => {
  const params = Promise.resolve({ id: "board1" });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await POST(mockRequest("POST"), { params });
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
    const res = await POST(mockRequest("POST"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when slack integration is not configured", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    });
    vi.mocked(prisma.integration.findUnique).mockResolvedValue(null);

    const res = await POST(mockRequest("POST"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 502 when Slack message fails to send", async () => {
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
      config: { webhookUrl: "https://hooks.slack.com/services/T00/B00/xxx" },
      isActive: true,
      boardId: "board1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(sendSlackMessage).mockResolvedValue(false);

    const res = await POST(mockRequest("POST"), { params });
    expect(res.status).toBe(502);
  });

  it("returns success when test message is sent", async () => {
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
      config: { webhookUrl: "https://hooks.slack.com/services/T00/B00/xxx" },
      isActive: true,
      boardId: "board1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(sendSlackMessage).mockResolvedValue(true);

    const res = await POST(mockRequest("POST"), { params });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendSlackMessage).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/T00/B00/xxx",
      expect.objectContaining({ text: expect.stringContaining("Test message") }),
    );
  });
});
