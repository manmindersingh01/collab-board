import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { POST } from "./route";

vi.mock("@/lib/time-tracking/timer", () => ({
  startTimer: vi.fn().mockResolvedValue({
    id: "entry1",
    cardId: "card1",
    userId: "user1",
    startedAt: new Date("2026-04-01T10:00:00Z"),
    stoppedAt: null,
    duration: null,
    isManual: false,
  }),
}));

const mockUser = { id: "user1", name: "Test", email: "test@test.com", clerkId: "clerk1" };

const mockCardWithMember = (role: string, assigneeId: string | null = null) => ({
  id: "card1",
  title: "Test Card",
  assigneeId,
  list: {
    boardId: "board1",
    board: {
      members: [{ role }],
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/cards/[id]/time/start", () => {
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

  it("returns 404 when user is not a board member", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card1",
      title: "Test",
      assigneeId: null,
      list: { boardId: "board1", board: { members: [] } },
    } as any);
    const res = await POST(mockRequest("POST"), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when viewer is not assignee", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCardWithMember("viewer") as any);
    const res = await POST(mockRequest("POST"), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 201 and creates timer for editor", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCardWithMember("editer") as any);
    const res = await POST(mockRequest("POST"), { params: Promise.resolve({ id: "card1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.id).toBe("entry1");
  });

  it("returns 201 for viewer who is assignee", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCardWithMember("viewer", "user1") as any);
    const res = await POST(mockRequest("POST"), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(201);
  });
});
