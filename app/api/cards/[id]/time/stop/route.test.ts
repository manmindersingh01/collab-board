import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { POST } from "./route";

const mockStopTimer = vi.fn();
vi.mock("@/lib/time-tracking/timer", () => ({
  stopTimer: (...args: any[]) => mockStopTimer(...args),
}));

const mockUser = { id: "user1", name: "Test", email: "test@test.com", clerkId: "clerk1" };

const mockCardWithMember = {
  id: "card1",
  title: "Test Card",
  assigneeId: null,
  list: {
    boardId: "board1",
    board: { members: [{ role: "editer" }] },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/cards/[id]/time/stop", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await POST(mockRequest("POST"), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when card not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    const res = await POST(mockRequest("POST"), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 and stopped entry on success", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCardWithMember as any);
    mockStopTimer.mockResolvedValue({
      id: "entry1",
      cardId: "card1",
      userId: "user1",
      duration: 45,
      stoppedAt: new Date(),
    });
    const res = await POST(mockRequest("POST"), { params: Promise.resolve({ id: "card1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.duration).toBe(45);
  });

  it("returns 400 when no active timer", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCardWithMember as any);
    mockStopTimer.mockRejectedValue(new Error("No active timer for this card"));
    const res = await POST(mockRequest("POST"), { params: Promise.resolve({ id: "card1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error).toBe("no active timer for this card");
  });
});
