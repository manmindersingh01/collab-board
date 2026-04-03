import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { GET, POST } from "./route";

const mockUser = {
  id: "user1",
  name: "Test",
  email: "test@test.com",
  clerkId: "clerk1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/boards/[id]/automations", () => {
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

  it("returns 403 when user is a viewer", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "viewer",
      joinedAt: new Date(),
    } as any);
    const res = await GET(mockRequest("GET"), { params });
    expect(res.status).toBe(403);
  });

  it("returns automations for editor+", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "editer",
      joinedAt: new Date(),
    } as any);
    const mockAutomations = [
      {
        id: "auto1",
        name: "Rule 1",
        isActive: true,
        trigger: { event: "card.created" },
        actions: [],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.mocked(prisma.automation.findMany).mockResolvedValue(mockAutomations);

    const res = await GET(mockRequest("GET"), { params });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Rule 1");
  });
});

describe("POST /api/boards/[id]/automations", () => {
  const params = Promise.resolve({ id: "board1" });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await POST(
      mockRequest("POST", {
        name: "Test",
        trigger: { event: "card.created" },
        actions: [],
      }),
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
    } as any);
    const res = await POST(
      mockRequest("POST", {
        name: "Test",
        trigger: { event: "card.created" },
        actions: [],
      }),
      { params },
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    const res = await POST(
      mockRequest("POST", {
        trigger: { event: "card.created" },
        actions: [],
      }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when trigger is missing event", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    const res = await POST(
      mockRequest("POST", {
        name: "Test",
        trigger: {},
        actions: [],
      }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when trigger event is invalid", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    const res = await POST(
      mockRequest("POST", {
        name: "Test",
        trigger: { event: "invalid.event" },
        actions: [],
      }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when actions contain invalid type", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    const res = await POST(
      mockRequest("POST", {
        name: "Test",
        trigger: { event: "card.created" },
        actions: [{ type: "explode" }],
      }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it("creates automation for owner with valid data", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    const created = {
      id: "auto1",
      name: "My Rule",
      isActive: true,
      trigger: { event: "card.created" },
      actions: [{ type: "set_field", field: "priority", value: "HIGH" }],
      boardId: "board1",
      createdBy: "user1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.automation.create).mockResolvedValue(created);

    const res = await POST(
      mockRequest("POST", {
        name: "My Rule",
        trigger: { event: "card.created" },
        actions: [{ type: "set_field", field: "priority", value: "HIGH" }],
      }),
      { params },
    );
    const { status, body } = await parseResponse(res);

    expect(status).toBe(201);
    expect(body.name).toBe("My Rule");
    expect(prisma.automation.create).toHaveBeenCalledWith({
      data: {
        name: "My Rule",
        trigger: { event: "card.created" },
        actions: [{ type: "set_field", field: "priority", value: "HIGH" }],
        boardId: "board1",
        createdBy: "user1",
      },
    });
  });
});
