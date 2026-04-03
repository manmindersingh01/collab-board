import prisma from "@/lib/prisma";
import type { BoardExport } from "./types";

export async function exportBoardAsJson(boardId: string): Promise<BoardExport> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { name: true, description: true },
  });

  if (!board) {
    throw new Error("Board not found");
  }

  const lists = await prisma.list.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    include: {
      card: {
        orderBy: { position: "asc" },
        where: { isArchived: false },
        include: {
          assignee: { select: { name: true } },
        },
      },
    },
  });

  return {
    board: {
      name: board.name,
      description: board.description,
    },
    lists: lists.map((list) => ({
      title: list.title,
      cards: list.card.map((card) => ({
        title: card.title,
        description: card.description,
        priority: card.priority,
        labels: card.labels,
        dueDate: card.dueDate ? card.dueDate.toISOString() : null,
        assignee: card.assignee?.name ?? null,
      })),
    })),
  };
}

/**
 * Escape a field for CSV output (RFC 4180).
 */
function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportBoardAsCsv(boardId: string): Promise<string> {
  const data = await exportBoardAsJson(boardId);

  const headers = [
    "Title",
    "Description",
    "List",
    "Priority",
    "Labels",
    "Due Date",
    "Assignee",
  ];

  const rows: string[] = [headers.join(",")];

  for (const list of data.lists) {
    for (const card of list.cards) {
      const row = [
        escapeCsvField(card.title),
        escapeCsvField(card.description ?? ""),
        escapeCsvField(list.title),
        card.priority,
        escapeCsvField(card.labels.join(",")),
        card.dueDate ?? "",
        escapeCsvField(card.assignee ?? ""),
      ];
      rows.push(row.join(","));
    }
  }

  return rows.join("\n");
}
