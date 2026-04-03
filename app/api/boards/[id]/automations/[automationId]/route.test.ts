import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { PATCH, DELETE } from "./route";

const mockUser = {
  id: "user1",
  name: "Test",
  email: "test@test.com",
  clerkId: "clerk1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/boards/[id]/automations/[automationId]", () => {
  const params = Promise.resolve({ id: "board1", automationId: "auto1" });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await PATCH(mockRequest("PATCH", { name: "Updated" }), {
      params,
    });
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
    const res = await PATCH(mockRequest("PATCH", { name: "Updated" }), {
      params,
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when automation not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);
    const res = await PATCH(mockRequest("PATCH", { name: "Updated" }), {
      params,
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when trigger event is invalid", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    vi.mocked(prisma.automation.findUnique).mockResolvedValue({
      id: "auto1",
      boardId: "board1",
    } as any);
    const res = await PATCH(
      mockRequest("PATCH", { trigger: { event: "invalid" } }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it("updates automation fields", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    vi.mocked(prisma.automation.findUnique).mockResolvedValue({
      id: "auto1",
      name: "Old Name",
      boardId: "board1",
    } as any);
    vi.mocked(prisma.automation.update).mockResolvedValue({
      id: "auto1",
      name: "New Name",
      isActive: false,
      boardId: "board1",
    } as any);

    const res = await PATCH(
      mockRequest("PATCH", { name: "New Name", isActive: false }),
      { params },
    );
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.name).toBe("New Name");
    expect(prisma.automation.update).toHaveBeenCalledWith({
      where: { id: "auto1" },
      data: expect.objectContaining({ name: "New Name", isActive: false }),
    });
  });
});

describe("DELETE /api/boards/[id]/automations/[automationId]", () => {
  const params = Promise.resolve({ id: "board1", automationId: "auto1" });

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
    } as any);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when automation not found", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    vi.mocked(prisma.automation.findUnique).mockResolvedValue(null);
    const res = await DELETE(mockRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("deletes the automation", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "owner",
      joinedAt: new Date(),
    } as any);
    vi.mocked(prisma.automation.findUnique).mockResolvedValue({
      id: "auto1",
      boardId: "board1",
    } as any);
    vi.mocked(prisma.automation.delete).mockResolvedValue({} as any);

    const res = await DELETE(mockRequest("DELETE"), { params });

    expect(res.status).toBe(200);
    expect(prisma.automation.delete).toHaveBeenCalledWith({
      where: { id: "auto1" },
    });
  });
});
