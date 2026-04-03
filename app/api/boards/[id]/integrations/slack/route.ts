import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

const SLACK_WEBHOOK_REGEX =
  /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+$/;

// POST /api/boards/[id]/integrations/slack — configure Slack integration
export async function POST(
  req: Request,
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
      { error: "only the board owner can configure integrations" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const { webhookUrl, channel } = body;

  if (!webhookUrl || !SLACK_WEBHOOK_REGEX.test(webhookUrl)) {
    return NextResponse.json(
      { error: "invalid Slack webhook URL" },
      { status: 400 },
    );
  }

  // Upsert: create or update
  const integration = await prisma.integration.upsert({
    where: { boardId_type: { boardId, type: "slack" } },
    create: {
      type: "slack",
      boardId,
      config: { webhookUrl, channel: channel ?? null },
      isActive: true,
    },
    update: {
      config: { webhookUrl, channel: channel ?? null },
      isActive: true,
    },
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "integration.configured",
    entityType: "integration",
    entityId: integration.id,
    metadata: { type: "slack" },
  });

  return NextResponse.json(integration, { status: 201 });
}

// DELETE /api/boards/[id]/integrations/slack — remove Slack integration
export async function DELETE(
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
      { error: "only the board owner can remove integrations" },
      { status: 403 },
    );
  }

  const existing = await prisma.integration.findUnique({
    where: { boardId_type: { boardId, type: "slack" } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "slack integration not found" },
      { status: 404 },
    );
  }

  await prisma.integration.delete({
    where: { boardId_type: { boardId, type: "slack" } },
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "integration.removed",
    entityType: "integration",
    entityId: existing.id,
    metadata: { type: "slack" },
  });

  return NextResponse.json({ success: true });
}
