import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ slug: string; keyId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug, keyId } = await ctx.params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });

  if (!workspace) return NextResponse.json({ error: "not found" }, { status: 404 });

  const member = workspace.members[0];
  if (!member || member.role !== "ADMIN") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!apiKey || apiKey.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "key not found" }, { status: 404 });
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isRevoked: true },
  });

  return NextResponse.json({ success: true });
}
