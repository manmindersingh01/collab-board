import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDbUser } from "@/lib/user";
import { POST } from "./route";

// Mock the parsers and import service
vi.mock("@/lib/import-export/trello-parser", () => ({
  parseTrelloExport: vi.fn(),
}));
vi.mock("@/lib/import-export/csv-parser", () => ({
  parseCsvImport: vi.fn(),
}));
vi.mock("@/lib/import-export/jira-parser", () => ({
  parseJiraExport: vi.fn(),
}));
vi.mock("@/lib/import-export/import", () => ({
  importBoard: vi.fn(),
}));

import { parseTrelloExport } from "@/lib/import-export/trello-parser";
import { parseCsvImport } from "@/lib/import-export/csv-parser";
import { parseJiraExport } from "@/lib/import-export/jira-parser";
import { importBoard } from "@/lib/import-export/import";

const mockUser = {
  id: "user1",
  name: "Test",
  email: "test@test.com",
  clerkId: "clerk1",
};

const mockParsedBoard = {
  name: "Test Board",
  description: null,
  lists: [{ title: "To Do", position: 1, cards: [] }],
};

function makeImportRequest(file?: File | null, format?: string | null) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  if (format) formData.append("format", format);
  return new Request("http://localhost:3000/api/boards/import", {
    method: "POST",
    body: formData,
  });
}

function makeJsonRequest(body: string) {
  return new Request("http://localhost:3000/api/boards/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/boards/import", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getDbUser).mockResolvedValue(undefined);
    const file = new File(['{"name":"Board"}'], "board.json", {
      type: "application/json",
    });
    const res = await POST(makeImportRequest(file, "trello"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const res = await POST(makeImportRequest(null, "trello"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("file");
  });

  it("returns 400 when format is missing", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const file = new File(["data"], "board.json");
    const res = await POST(makeImportRequest(file, null));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("format");
  });

  it("returns 400 for invalid format", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const file = new File(["data"], "board.xml");
    const res = await POST(makeImportRequest(file, "xml"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not multipart form data", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const res = await POST(makeJsonRequest('{"bad":"body"}'));
    expect(res.status).toBe(400);
  });

  it("parses Trello format and imports", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(parseTrelloExport).mockReturnValue(mockParsedBoard);
    vi.mocked(importBoard).mockResolvedValue({ boardId: "new-board" });

    const file = new File(
      [JSON.stringify({ name: "Trello Board", lists: [], cards: [] })],
      "board.json",
      { type: "application/json" },
    );
    const res = await POST(makeImportRequest(file, "trello"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.boardId).toBe("new-board");
    expect(parseTrelloExport).toHaveBeenCalled();
    expect(importBoard).toHaveBeenCalledWith(mockParsedBoard, "user1");
  });

  it("parses CSV format and imports", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(parseCsvImport).mockReturnValue(mockParsedBoard);
    vi.mocked(importBoard).mockResolvedValue({ boardId: "new-board" });

    const file = new File(
      ["Title,List\nTask,To Do"],
      "board.csv",
      { type: "text/csv" },
    );
    const res = await POST(makeImportRequest(file, "csv"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(parseCsvImport).toHaveBeenCalled();
  });

  it("parses Jira format and imports", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(parseJiraExport).mockReturnValue(mockParsedBoard);
    vi.mocked(importBoard).mockResolvedValue({ boardId: "new-board" });

    const file = new File(
      ["Summary,Status\nTask,To Do"],
      "jira.csv",
      { type: "text/csv" },
    );
    const res = await POST(makeImportRequest(file, "jira"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(parseJiraExport).toHaveBeenCalled();
  });

  it("returns 422 when parsing fails", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(parseTrelloExport).mockImplementation(() => {
      throw new Error("Invalid Trello export: missing board name");
    });

    const file = new File(["{}"], "bad.json", { type: "application/json" });
    const res = await POST(makeImportRequest(file, "trello"));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("missing board name");
  });

  it("returns 500 when import fails", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    vi.mocked(parseTrelloExport).mockReturnValue(mockParsedBoard);
    vi.mocked(importBoard).mockRejectedValue(new Error("DB error"));

    const file = new File(
      [JSON.stringify({ name: "Board", lists: [], cards: [] })],
      "board.json",
    );
    const res = await POST(makeImportRequest(file, "trello"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("DB error");
  });

  it("returns 400 for empty file", async () => {
    vi.mocked(getDbUser).mockResolvedValue(mockUser as any);
    const file = new File([""], "empty.json", { type: "application/json" });
    const res = await POST(makeImportRequest(file, "trello"));
    expect(res.status).toBe(400);
  });
});
