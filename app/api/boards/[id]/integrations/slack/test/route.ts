import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { sendSlackMessage } from "@/lib/integrations/slack";
import { NextResponse } from "next/server";

// POST /api/boards/[id]/integrations/slack/test — send a test message
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;

  // Owner only
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can test integrations" },
      { status: 403 },
    );
  }

  const integration = await prisma.integration.findUnique({
    where: { boardId_type: { boardId, type: "slack" } },
  });

  if (!integration) {
    return NextResponse.json(
      { error: "slack integration not configured" },
      { status: 404 },
    );
  }

  const config = integration.config as { webhookUrl?: string };
  if (!config.webhookUrl) {
    return NextResponse.json(
      { error: "webhook URL not configured" },
      { status: 400 },
    );
  }

  const success = await sendSlackMessage(config.webhookUrl, {
    text: "🧪 Test message from CollabBoard — your Slack integration is working!",
  });

  if (!success) {
    return NextResponse.json(
      { error: "failed to send test message" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
