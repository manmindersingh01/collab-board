import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

const REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

// POST /api/boards/[id]/integrations/github — configure GitHub integration
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
  const { repo, token } = body;

  if (!repo || !REPO_REGEX.test(repo)) {
    return NextResponse.json(
      { error: "invalid repo format, expected owner/repo" },
      { status: 400 },
    );
  }

  if (!token?.trim()) {
    return NextResponse.json(
      { error: "token is required" },
      { status: 400 },
    );
  }

  // Generate a webhook secret for signature verification
  const webhookSecret = crypto.randomUUID();

  const integration = await prisma.integration.upsert({
    where: { boardId_type: { boardId, type: "github" } },
    create: {
      type: "github",
      boardId,
      config: { repo, token, webhookSecret },
      isActive: true,
    },
    update: {
      config: { repo, token, webhookSecret },
      isActive: true,
    },
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "integration.configured",
    entityType: "integration",
    entityId: integration.id,
    metadata: { type: "github", repo },
  });

  return NextResponse.json(
    { ...integration, webhookSecret },
    { status: 201 },
  );
}

// DELETE /api/boards/[id]/integrations/github — remove GitHub integration
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
    where: { boardId_type: { boardId, type: "github" } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "github integration not found" },
      { status: 404 },
    );
  }

  await prisma.integration.delete({
    where: { boardId_type: { boardId, type: "github" } },
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "integration.removed",
    entityType: "integration",
    entityId: existing.id,
    metadata: { type: "github" },
  });

  return NextResponse.json({ success: true });
}
