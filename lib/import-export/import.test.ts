import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { importBoard } from "./import";
import type { ParsedBoard } from "./types";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockParsed: ParsedBoard = {
  name: "Imported Board",
  description: "A board from Trello",
  lists: [
    {
      title: "To Do",
      position: 1,
      cards: [
        {
          title: "Fix login",
          description: "Auth is broken",
          priority: "HIGH",
          labels: ["bug"],
          dueDate: "2026-04-01T00:00:00.000Z",
          position: 1,
        },
        {
          title: "Add tests",
          description: null,
          priority: "NONE",
          labels: [],
          dueDate: null,
          position: 2,
        },
      ],
    },
    {
      title: "Done",
      position: 2,
      cards: [],
    },
  ],
};

describe("importBoard", () => {
  it("creates board, member, lists, and cards in a transaction", async () => {
    // The $transaction mock calls the fn with a tx object that has mocked models
    const txBoard = { id: "new-board-id", name: "Imported Board" };
    const txList1 = { id: "new-list-1" };
    const txList2 = { id: "new-list-2" };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        board: {
          create: vi.fn().mockResolvedValue(txBoard),
        },
        boardMember: {
          create: vi.fn().mockResolvedValue({}),
        },
        list: {
          create: vi
            .fn()
            .mockResolvedValueOnce(txList1)
            .mockResolvedValueOnce(txList2),
        },
        $executeRaw: vi.fn().mockResolvedValue(1),
      };
      return fn(tx);
    });

    const result = await importBoard(mockParsed, "user1");

    expect(result.boardId).toBe("new-board-id");

    // Verify the transaction was called
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("creates board with correct data", async () => {
    let capturedBoardCreate: any;
    let capturedMemberCreate: any;

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        board: {
          create: vi.fn().mockImplementation((args) => {
            capturedBoardCreate = args;
            return { id: "board-id" };
          }),
        },
        boardMember: {
          create: vi.fn().mockImplementation((args) => {
            capturedMemberCreate = args;
            return {};
          }),
        },
        list: {
          create: vi.fn().mockResolvedValue({ id: "list-id" }),
        },
        $executeRaw: vi.fn().mockResolvedValue(1),
      };
      return fn(tx);
    });

    await importBoard(mockParsed, "owner-user");

    expect(capturedBoardCreate.data.name).toBe("Imported Board");
    expect(capturedBoardCreate.data.description).toBe("A board from Trello");
    expect(capturedBoardCreate.data.ownerId).toBe("owner-user");

    expect(capturedMemberCreate.data.boardId).toBe("board-id");
    expect(capturedMemberCreate.data.userId).toBe("owner-user");
    expect(capturedMemberCreate.data.role).toBe("owner");
  });

  it("creates correct number of lists and cards", async () => {
    let listCreateCount = 0;
    let cardInsertCount = 0;

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        board: {
          create: vi.fn().mockResolvedValue({ id: "board-id" }),
        },
        boardMember: {
          create: vi.fn().mockResolvedValue({}),
        },
        list: {
          create: vi.fn().mockImplementation(() => {
            listCreateCount++;
            return { id: `list-${listCreateCount}` };
          }),
        },
        $executeRaw: vi.fn().mockImplementation(() => {
          cardInsertCount++;
          return 1;
        }),
      };
      return fn(tx);
    });

    await importBoard(mockParsed, "user1");

    expect(listCreateCount).toBe(2); // 2 lists
    expect(cardInsertCount).toBe(2); // 2 cards (both in first list)
  });

  it("handles empty board (no lists)", async () => {
    const emptyBoard: ParsedBoard = {
      name: "Empty",
      description: null,
      lists: [],
    };

    let listCreateCount = 0;

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        board: {
          create: vi.fn().mockResolvedValue({ id: "board-id" }),
        },
        boardMember: {
          create: vi.fn().mockResolvedValue({}),
        },
        list: {
          create: vi.fn().mockImplementation(() => {
            listCreateCount++;
            return { id: `list-${listCreateCount}` };
          }),
        },
        $executeRaw: vi.fn().mockResolvedValue(1),
      };
      return fn(tx);
    });

    const result = await importBoard(emptyBoard, "user1");
    expect(result.boardId).toBe("board-id");
    expect(listCreateCount).toBe(0);
  });

  it("propagates transaction errors", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error("DB connection failed"),
    );

    await expect(importBoard(mockParsed, "user1")).rejects.toThrow(
      "DB connection failed",
    );
  });
});
