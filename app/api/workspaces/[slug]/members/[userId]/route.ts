import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// DELETE /api/workspaces/[slug]/members/[userId] — Remove member (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug, userId: targetUserId } = await params;

  // Check caller is ADMIN
  const membership = await prisma.$queryRawUnsafe<
    { role: string; workspaceId: string }[]
  >(
    `SELECT wm."role", wm."workspaceId"
     FROM "WorkspaceMember" wm
     JOIN "Workspace" w ON w."id" = wm."workspaceId"
     WHERE w."slug" = $1 AND wm."userId" = $2`,
    slug,
    user.id
  );

  if (!membership.length || membership[0].role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Prevent removing yourself if you're the only ADMIN
  if (targetUserId === user.id) {
    const adminCount = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*)::int as count FROM "WorkspaceMember"
       WHERE "workspaceId" = $1 AND "role" = 'ADMIN'`,
      membership[0].workspaceId
    );

    if (adminCount[0].count <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin. Transfer ownership first." },
        { status: 400 }
      );
    }
  }

  await prisma.$executeRawUnsafe(
    `DELETE FROM "WorkspaceMember"
     WHERE "workspaceId" = $1 AND "userId" = $2`,
    membership[0].workspaceId,
    targetUserId
  );

  return NextResponse.json({ success: true });
}
