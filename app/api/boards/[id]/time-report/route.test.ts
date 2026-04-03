import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { GET } from "./route";

vi.mock("@/lib/time-tracking/reports", () => ({
  generateTimeReport: vi.fn().mockResolvedValue({
    totalMinutes: 120,
    byUser: [{ userId: "user1", name: "Alice", minutes: 120 }],
    byCard: [{ cardId: "card1", title: "Task", minutes: 120 }],
    byDay: [{ date: "2026-04-01", minutes: 120 }],
  }),
}));

const mockUser = { id: "user1", name: "Test", email: "test@test.com", clerkId: "clerk1" };

function makeRequest(queryStr: string) {
  return new Request(`http://localhost:3000/api/boards/board1/time-report${queryStr}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/boards/[id]/time-report", () => {
  const params = Promise.resolve({ id: "board1" });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await GET(makeRequest("?from=2026-04-01&to=2026-04-07"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when not a board member", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await GET(makeRequest("?from=2026-04-01&to=2026-04-07"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 when from/to missing", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ role: "editer" } as any);
    const res = await GET(makeRequest(""), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid dates", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ role: "editer" } as any);
    const res = await GET(makeRequest("?from=not-a-date&to=also-not"), { params });
    expect(res.status).toBe(400);
  });

  it("returns report with correct shape", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ role: "editer" } as any);
    const res = await GET(makeRequest("?from=2026-04-01&to=2026-04-07"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.totalMinutes).toBe(120);
    expect(body.byUser).toHaveLength(1);
    expect(body.byCard).toHaveLength(1);
    expect(body.byDay).toHaveLength(1);
  });
});
