import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// ── PATCH /api/notifications/read — mark notifications as read ──

export async function PATCH(req: Request) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.all === true) {
    // Mark all notifications as read for this user
    await prisma.$executeRawUnsafe(
      `UPDATE "Notification" SET "isRead" = true WHERE "userId" = $1 AND "isRead" = false`,
      user.id,
    );
    return NextResponse.json({ success: true });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: "provide ids array or { all: true }" },
      { status: 400 },
    );
  }

  // Mark specific notifications as read (only if owned by this user)
  const placeholders = body.ids
    .map((_: string, i: number) => `$${i + 2}`)
    .join(", ");

  await prisma.$executeRawUnsafe(
    `UPDATE "Notification" SET "isRead" = true WHERE "userId" = $1 AND "id" IN (${placeholders})`,
    user.id,
    ...body.ids,
  );

  return NextResponse.json({ success: true });
}
