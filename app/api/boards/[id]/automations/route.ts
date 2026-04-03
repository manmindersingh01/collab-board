import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

const VALID_EVENTS = [
  "card.created",
  "card.moved",
  "card.updated",
  "card.completed",
  "due.approaching",
  "due.overdue",
];

const VALID_ACTION_TYPES = [
  "set_field",
  "move_to_list",
  "assign",
  "unassign",
  "add_label",
  "remove_label",
  "notify",
  "add_comment",
];

// ── GET /api/boards/[id]/automations — list all automations ──

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (membership.role === "viewer") {
    return NextResponse.json(
      { error: "editor access required" },
      { status: 403 },
    );
  }

  const automations = await prisma.automation.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(automations);
}

// ── POST /api/boards/[id]/automations — create automation ──

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;
  const body = await req.json();
  const { name, trigger, actions } = body;

  // Auth: owner only
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can create automations" },
      { status: 403 },
    );
  }

  // Validate name
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Validate trigger
  if (!trigger?.event || !VALID_EVENTS.includes(trigger.event)) {
    return NextResponse.json(
      { error: "invalid trigger event" },
      { status: 400 },
    );
  }

  // Validate actions
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!VALID_ACTION_TYPES.includes(action.type)) {
        return NextResponse.json(
          { error: `invalid action type: ${action.type}` },
          { status: 400 },
        );
      }
    }
  }

  const automation = await prisma.automation.create({
    data: {
      name: name.trim(),
      trigger,
      actions: actions ?? [],
      boardId,
      createdBy: user.id,
    },
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "automation.created",
    entityType: "automation",
    entityId: automation.id,
    metadata: { name: automation.name },
  });

  return NextResponse.json(automation, { status: 201 });
}
