import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { GET } from "./route";

// Mock the export module
vi.mock("@/lib/import-export/export", () => ({
  exportBoardAsJson: vi.fn(),
  exportBoardAsCsv: vi.fn(),
}));

import { exportBoardAsJson, exportBoardAsCsv } from "@/lib/import-export/export";

const mockUser = {
  id: "user1",
  name: "Test",
  email: "test@test.com",
  clerkId: "clerk1",
};

function makeExportRequest(format?: string) {
  const url = format
    ? `http://localhost:3000/api/boards/board1/export?format=${format}`
    : "http://localhost:3000/api/boards/board1/export";
  return new Request(url, { method: "GET" });
}

const params = Promise.resolve({ id: "board1" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/boards/[id]/export", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const res = await GET(makeExportRequest("json"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 when format is missing", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const res = await GET(makeExportRequest(), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error).toContain("format");
  });

  it("returns 400 for invalid format", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const res = await GET(makeExportRequest("xml"), { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 when user is not a member", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await GET(makeExportRequest("json"), { params });
    expect(res.status).toBe(404);
  });

  it("returns JSON export with correct content-type", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "viewer",
      joinedAt: new Date(),
    } as any);

    const exportData = {
      board: { name: "Test", description: null },
      lists: [],
    };
    vi.mocked(exportBoardAsJson).mockResolvedValue(exportData);

    const res = await GET(makeExportRequest("json"), { params });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.board.name).toBe("Test");
    expect(exportBoardAsJson).toHaveBeenCalledWith("board1");
  });

  it("returns CSV export with correct content-type", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "viewer",
      joinedAt: new Date(),
    } as any);

    vi.mocked(exportBoardAsCsv).mockResolvedValue(
      "Title,Description\nTest,Desc",
    );

    const res = await GET(makeExportRequest("csv"), { params });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("board-export.csv");

    const text = await res.text();
    expect(text).toContain("Title,Description");
  });

  it("returns 500 when export fails", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: "board1",
      userId: "user1",
      role: "viewer",
      joinedAt: new Date(),
    } as any);
    vi.mocked(exportBoardAsJson).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeExportRequest("json"), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(500);
    expect(body.error).toBe("DB error");
  });
});
