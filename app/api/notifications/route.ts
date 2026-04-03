import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// ── GET /api/notifications — list notifications for current user ──

export async function GET() {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.$queryRawUnsafe<
      {
        id: string;
        type: string;
        title: string;
        message: string;
        link: string | null;
        isRead: boolean;
        createdAt: Date;
      }[]
    >(
      `SELECT "id", "type", "title", "message", "link", "isRead", "createdAt"
       FROM "Notification"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 50`,
      user.id,
    ),
    prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Notification" WHERE "userId" = $1 AND "isRead" = false`,
      user.id,
    ),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount: Number(unreadCount[0].count),
  });
}
