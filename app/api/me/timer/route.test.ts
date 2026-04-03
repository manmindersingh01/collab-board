import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import { getDbUser } from "@/lib/user";
import { GET } from "./route";

const mockGetActiveTimer = vi.fn();
vi.mock("@/lib/time-tracking/timer", () => ({
  getActiveTimer: (...args: any[]) => mockGetActiveTimer(...args),
}));

const mockUser = { id: "user1", name: "Test", email: "test@test.com", clerkId: "clerk1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/me/timer", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns active timer when one exists", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const timer = {
      id: "entry1",
      cardId: "card1",
      userId: "user1",
      startedAt: new Date("2026-04-01T10:00:00Z").toISOString(),
      stoppedAt: null,
      card: { id: "card1", title: "Test Card", list: { boardId: "board1" } },
    };
    mockGetActiveTimer.mockResolvedValue(timer);

    const res = await GET();
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.id).toBe("entry1");
    expect(body.card.title).toBe("Test Card");
  });

  it("returns null when no active timer", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    mockGetActiveTimer.mockResolvedValue(null);

    const res = await GET();
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toBeNull();
  });
});
