import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cards = await prisma.card.findMany({
    where: { assigneeId: user.id },
    include: {
      list: {
        select: {
          id: true,
          title: true,
          board: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Resolve completion list titles in a single batch query
  const completionIds = [
    ...new Set(
      cards.map((c) => c.completionListId).filter(Boolean) as string[],
    ),
  ];

  const completionLists =
    completionIds.length > 0
      ? await prisma.list.findMany({
          where: { id: { in: completionIds } },
          select: { id: true, title: true },
        })
      : [];

  const completionMap = new Map(completionLists.map((l) => [l.id, l.title]));

  const result = cards.map((c) => ({
    ...c,
    completionListTitle: c.completionListId
      ? completionMap.get(c.completionListId) ?? null
      : null,
  }));

  return NextResponse.json(result);
}
