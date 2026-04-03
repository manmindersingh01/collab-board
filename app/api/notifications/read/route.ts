import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.all === true) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: "provide ids array or { all: true }" },
      { status: 400 },
    );
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, id: { in: body.ids } },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
