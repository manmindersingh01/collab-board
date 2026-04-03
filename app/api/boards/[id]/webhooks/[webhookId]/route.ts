import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string; webhookId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: boardId, webhookId } = await ctx.params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: { where: { userId: user.id }, select: { role: true } } },
  });

  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });

  const member = board.members[0];
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }

  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: webhookId } });
  if (!endpoint || endpoint.boardId !== boardId) {
    return NextResponse.json({ error: "webhook not found" }, { status: 404 });
  }

  await prisma.webhookEndpoint.delete({ where: { id: webhookId } });

  return NextResponse.json({ success: true });
}
