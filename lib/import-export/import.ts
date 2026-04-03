import prisma from "@/lib/prisma";
import type { ParsedBoard } from "./types";

export async function importBoard(
  parsed: ParsedBoard,
  ownerId: string,
): Promise<{ boardId: string }> {
  const boardId = await prisma.$transaction(async (tx) => {
    // Create board
    const board = await tx.board.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        ownerId,
      },
    });

    // Add owner as board member
    await tx.boardMember.create({
      data: {
        boardId: board.id,
        userId: ownerId,
        role: "owner",
      },
    });

    // Create lists and cards
    for (const list of parsed.lists) {
      const newList = await tx.list.create({
        data: {
          title: list.title,
          position: list.position,
          boardId: board.id,
        },
      });

      // Cards use raw SQL because of the vector column
      for (const card of list.cards) {
        const cardId = crypto.randomUUID();
        const now = new Date();
        await tx.$executeRaw`
          INSERT INTO "Card" (
            "id", "title", "description", "position", "priority",
            "labels", "dueDate", "listId", "createdAt", "updatedAt"
          ) VALUES (
            ${cardId}, ${card.title}, ${card.description},
            ${card.position}, ${card.priority}::"Priority",
            ${card.labels}, ${card.dueDate ? new Date(card.dueDate) : null},
            ${newList.id}, ${now}, ${now}
          )
        `;
      }
    }

    return board.id;
  });

  return { boardId };
}
