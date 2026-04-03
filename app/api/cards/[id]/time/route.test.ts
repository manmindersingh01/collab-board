import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { GET, POST } from "./route";

const mockUser = { id: "user1", name: "Test", email: "test@test.com", clerkId: "clerk1" };

const mockCardWithMember = (role: string) => ({
  id: "card1",
  title: "Test Card",
  assigneeId: null,
  list: {
    boardId: "board1",
    board: { members: [{ role }] },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/cards/[id]/time", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await GET(mockRequest("GET"), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when card not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    const res = await GET(mockRequest("GET"), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(404);
  });

  it("returns time entries for card", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCardWithMember("viewer") as any);

    const entries = [
      { id: "e1", duration: 60, user: { id: "user1", name: "Test", avatarUrl: null } },
    ];
    vi.mocked(prisma.timeEntry.findMany).mockResolvedValue(entries as any);

    const res = await GET(mockRequest("GET"), { params: Promise.resolve({ id: "card1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].duration).toBe(60);
  });
});

describe("POST /api/cards/[id]/time (manual entry)", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await POST(mockRequest("POST", { duration: 30 }), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing duration", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const res = await POST(mockRequest("POST", {}), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative duration", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const res = await POST(mockRequest("POST", { duration: -5 }), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when card not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    const res = await POST(mockRequest("POST", { duration: 30 }), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 for viewer", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCardWithMember("viewer") as any);
    const res = await POST(mockRequest("POST", { duration: 30 }), { params: Promise.resolve({ id: "card1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 201 with manual entry for editor", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCardWithMember("editer") as any);
    vi.mocked(prisma.timeEntry.create).mockResolvedValue({
      id: "e1",
      duration: 30,
      isManual: true,
      description: "Standup",
    } as any);

    const res = await POST(
      mockRequest("POST", { duration: 30, description: "Standup" }),
      { params: Promise.resolve({ id: "card1" }) },
    );
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.isManual).toBe(true);
    expect(body.duration).toBe(30);
  });
});
