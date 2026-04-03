import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { DELETE } from "./route";

const mockUser = { id: "user1", name: "Test", email: "test@test.com", clerkId: "clerk1" };

const mockEntry = (entryUserId: string, boardOwnerId: string) => ({
  id: "entry1",
  cardId: "card1",
  userId: entryUserId,
  card: {
    list: {
      board: {
        ownerId: boardOwnerId,
        members: [{ role: "editer" }],
      },
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/cards/[id]/time/[entryId]", () => {
  const params = Promise.resolve({ id: "card1", entryId: "entry1" });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when entry not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.timeEntry.findUnique).mockResolvedValue(null);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 404 when cardId mismatch", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.timeEntry.findUnique).mockResolvedValue({
      ...mockEntry("user2", "user3"),
      cardId: "other-card",
    } as any);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not entry owner or board owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.timeEntry.findUnique).mockResolvedValue(mockEntry("user2", "user3") as any);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 200 when user is entry owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.timeEntry.findUnique).mockResolvedValue(mockEntry("user1", "user3") as any);
    vi.mocked(prisma.timeEntry.delete).mockResolvedValue({} as any);
    const res = await DELETE(mockRequest("DELETE"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 200 when user is board owner", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.timeEntry.findUnique).mockResolvedValue(mockEntry("user2", "user1") as any);
    vi.mocked(prisma.timeEntry.delete).mockResolvedValue({} as any);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(200);
  });
});
