import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { signPayload } from "@/lib/webhooks/signing";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string; webhookId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
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

  const testPayload = JSON.stringify({
    event: "test",
    data: { message: "This is a test webhook from CollabBoard" },
    timestamp: new Date().toISOString(),
  });
  const signature = signPayload(testPayload, endpoint.secret);

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CollabBoard-Signature": signature,
        "X-CollabBoard-Event": "test",
      },
      body: testPayload,
      signal: AbortSignal.timeout(5000),
    });

    return NextResponse.json({
      success: res.ok,
      statusCode: res.status,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Request failed",
    });
  }
}
