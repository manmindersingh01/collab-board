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

type Params = { id: string; automationId: string };

// ── PATCH /api/boards/[id]/automations/[automationId] ──

export async function PATCH(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId, automationId } = await params;
  const body = await req.json();

  // Auth: owner only
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can update automations" },
      { status: 403 },
    );
  }

  // Check exists
  const existing = await prisma.automation.findUnique({
    where: { id: automationId },
  });

  if (!existing || existing.boardId !== boardId) {
    return NextResponse.json(
      { error: "automation not found" },
      { status: 404 },
    );
  }

  // Validate trigger if provided
  if (body.trigger?.event && !VALID_EVENTS.includes(body.trigger.event)) {
    return NextResponse.json(
      { error: "invalid trigger event" },
      { status: 400 },
    );
  }

  // Validate actions if provided
  if (Array.isArray(body.actions)) {
    for (const action of body.actions) {
      if (!VALID_ACTION_TYPES.includes(action.type)) {
        return NextResponse.json(
          { error: `invalid action type: ${action.type}` },
          { status: 400 },
        );
      }
    }
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.trigger !== undefined) data.trigger = body.trigger;
  if (body.actions !== undefined) data.actions = body.actions;

  const updated = await prisma.automation.update({
    where: { id: automationId },
    data,
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "automation.updated",
    entityType: "automation",
    entityId: automationId,
    metadata: { name: updated.name },
  });

  return NextResponse.json(updated);
}

// ── DELETE /api/boards/[id]/automations/[automationId] ──

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId, automationId } = await params;

  // Auth: owner only
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can delete automations" },
      { status: 403 },
    );
  }

  // Check exists
  const existing = await prisma.automation.findUnique({
    where: { id: automationId },
  });

  if (!existing || existing.boardId !== boardId) {
    return NextResponse.json(
      { error: "automation not found" },
      { status: 404 },
    );
  }

  await prisma.automation.delete({ where: { id: automationId } });

  logActivity({
    boardId,
    userId: user.id,
    action: "automation.deleted",
    entityType: "automation",
    entityId: automationId,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ deleted: true });
}
