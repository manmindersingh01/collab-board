import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { exportBoardAsJson, exportBoardAsCsv } from "./export";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockBoard = { name: "Test Board", description: "A board" };

const mockLists = [
  {
    id: "list1",
    title: "To Do",
    position: 1,
    boardId: "board1",
    createdAt: new Date(),
    card: [
      {
        id: "card1",
        title: "Fix login",
        description: "Auth is broken",
        position: 1,
        priority: "HIGH",
        labels: ["bug", "frontend"],
        dueDate: new Date("2026-04-01T00:00:00.000Z"),
        isArchived: false,
        assignee: { name: "Alice" },
      },
      {
        id: "card2",
        title: "No assignee card",
        description: null,
        position: 2,
        priority: "NONE",
        labels: [],
        dueDate: null,
        isArchived: false,
        assignee: null,
      },
    ],
  },
  {
    id: "list2",
    title: "Done",
    position: 2,
    boardId: "board1",
    createdAt: new Date(),
    card: [],
  },
];

describe("exportBoardAsJson", () => {
  it("returns correct export structure", async () => {
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
    vi.mocked(prisma.list.findMany).mockResolvedValue(mockLists as any);

    const result = await exportBoardAsJson("board1");

    expect(result.board.name).toBe("Test Board");
    expect(result.board.description).toBe("A board");
    expect(result.lists).toHaveLength(2);
    expect(result.lists[0].title).toBe("To Do");
    expect(result.lists[0].cards).toHaveLength(2);
    expect(result.lists[0].cards[0].title).toBe("Fix login");
    expect(result.lists[0].cards[0].assignee).toBe("Alice");
    expect(result.lists[0].cards[0].dueDate).toBe("2026-04-01T00:00:00.000Z");
    expect(result.lists[0].cards[1].assignee).toBeNull();
    expect(result.lists[0].cards[1].dueDate).toBeNull();
    expect(result.lists[1].title).toBe("Done");
    expect(result.lists[1].cards).toHaveLength(0);
  });

  it("throws when board not found", async () => {
    vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

    await expect(exportBoardAsJson("missing")).rejects.toThrow(
      "Board not found",
    );
  });

  it("handles empty board (no lists)", async () => {
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
    vi.mocked(prisma.list.findMany).mockResolvedValue([]);

    const result = await exportBoardAsJson("board1");
    expect(result.lists).toHaveLength(0);
  });
});

describe("exportBoardAsCsv", () => {
  it("returns CSV with correct headers and rows", async () => {
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
    vi.mocked(prisma.list.findMany).mockResolvedValue(mockLists as any);

    const csv = await exportBoardAsCsv("board1");
    const lines = csv.split("\n");

    expect(lines[0]).toBe(
      "Title,Description,List,Priority,Labels,Due Date,Assignee",
    );
    expect(lines).toHaveLength(3); // header + 2 cards
  });

  it("properly escapes commas in fields", async () => {
    const listsWithCommas = [
      {
        id: "list1",
        title: "To Do",
        position: 1,
        boardId: "board1",
        createdAt: new Date(),
        card: [
          {
            id: "card1",
            title: "Fix, deploy",
            description: 'He said "hello"',
            position: 1,
            priority: "HIGH",
            labels: ["bug", "frontend"],
            dueDate: null,
            isArchived: false,
            assignee: null,
          },
        ],
      },
    ];

    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
    vi.mocked(prisma.list.findMany).mockResolvedValue(listsWithCommas as any);

    const csv = await exportBoardAsCsv("board1");
    const dataLine = csv.split("\n")[1];

    // Title should be quoted because it contains a comma
    expect(dataLine).toContain('"Fix, deploy"');
    // Description should have escaped quotes
    expect(dataLine).toContain('"He said ""hello"""');
    // Labels joined with comma should be quoted
    expect(dataLine).toContain('"bug,frontend"');
  });

  it("handles empty board", async () => {
    vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
    vi.mocked(prisma.list.findMany).mockResolvedValue([]);

    const csv = await exportBoardAsCsv("board1");
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // just headers
    expect(lines[0]).toContain("Title");
  });
});
