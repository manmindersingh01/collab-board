import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: Date | null;
  listTitle: string;
  boardId: string;
  boardName: string;
}

export async function GET(req: Request) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length === 0) {
    return NextResponse.json([]);
  }

  const results = await prisma.$queryRawUnsafe<SearchResult[]>(
    `
    SELECT c.id, c.title, c.description, c.priority, c."dueDate",
           l.title as "listTitle", b.id as "boardId", b.name as "boardName"
    FROM "Card" c
    JOIN "List" l ON c."listId" = l.id
    JOIN "Board" b ON l."boardId" = b.id
    JOIN "BoardMember" bm ON b.id = bm."boardId"
    WHERE bm."userId" = $1
      AND b."isArchived" = false
      AND (c.title ILIKE '%' || $2 || '%' OR c.description ILIKE '%' || $2 || '%')
    ORDER BY c."updatedAt" DESC
    LIMIT 20
    `,
    user.id,
    query,
  );

  // Group results by board
  const grouped: Record<
    string,
    { boardId: string; boardName: string; cards: Omit<SearchResult, "boardId" | "boardName">[] }
  > = {};

  for (const row of results) {
    if (!grouped[row.boardId]) {
      grouped[row.boardId] = {
        boardId: row.boardId,
        boardName: row.boardName,
        cards: [],
      };
    }
    grouped[row.boardId].cards.push({
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      dueDate: row.dueDate,
      listTitle: row.listTitle,
    });
  }

  return NextResponse.json(Object.values(grouped));
}
