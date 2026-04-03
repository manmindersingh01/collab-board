import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// ── DELETE /api/boards/[id]/templates/[templateId] ───────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId, templateId } = await params;

  // Owner only
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (membership.role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can delete templates" },
      { status: 403 },
    );
  }

  // Verify template belongs to board
  const existing = await prisma.cardTemplate.findFirst({
    where: { id: templateId, boardId },
  });

  if (!existing) {
    return NextResponse.json({ error: "template not found" }, { status: 404 });
  }

  await prisma.cardTemplate.delete({
    where: { id: templateId },
  });

  return NextResponse.json({ success: true });
}
