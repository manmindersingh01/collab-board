import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { generateTimeReport } from "@/lib/time-tracking/reports";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;

  // Verify board membership
  const member = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!member) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const userId = url.searchParams.get("userId") || undefined;

  if (!fromStr || !toStr) {
    return NextResponse.json(
      { error: "from and to query params are required (ISO dates)" },
      { status: 400 },
    );
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json(
      { error: "invalid date format" },
      { status: 400 },
    );
  }

  const report = await generateTimeReport(boardId, from, to, userId);

  return NextResponse.json(report);
}
