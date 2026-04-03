import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { emitCardUpdated } from "@/lib/realtime-emitters";
import { NextResponse } from "next/server";

// ── GET /api/cards/[id] — full card with comments ───────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      list: {
        select: {
          id: true,
          title: true,
          boardId: true,
          board: {
            select: {
              members: {
                where: { userId: user.id },
                select: { role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!card || card.list.board.members.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

// ── PATCH /api/cards/[id] — update card fields ──────────

const VALID_PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: cardId } = await params;
  const body = await req.json();

  // Verify access (Editor+)
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: {
        select: {
          title: true,
          boardId: true,
          board: {
            select: {
              members: {
                where: { userId: user.id },
                select: { role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!card || card.list.board.members.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (card.list.board.members[0].role === "viewer") {
    return NextResponse.json(
      { error: "viewers cannot edit cards" },
      { status: 403 },
    );
  }

  // Build dynamic UPDATE (raw SQL — Prisma update blocked by vector column)
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  const changes: Record<string, unknown> = {};

  if (body.title !== undefined && typeof body.title === "string") {
    updates.push(`"title" = $${idx++}`);
    values.push(body.title.trim());
    changes.title = body.title.trim();
  }

  if (body.description !== undefined) {
    updates.push(`"description" = $${idx++}`);
    values.push(body.description);
    changes.description = true;
  }

  if (body.priority !== undefined && VALID_PRIORITIES.includes(body.priority)) {
    updates.push(`"priority" = $${idx++}::"Priority"`);
    values.push(body.priority);
    changes.priority = body.priority;
  }

  if (body.labels !== undefined && Array.isArray(body.labels)) {
    updates.push(`"labels" = $${idx++}::TEXT[]`);
    values.push(body.labels);
    changes.labels = body.labels;
  }

  if (body.dueDate !== undefined) {
    if (body.dueDate === null) {
      updates.push(`"dueDate" = NULL`);
    } else {
      updates.push(`"dueDate" = $${idx++}`);
      values.push(new Date(body.dueDate));
    }
    changes.dueDate = body.dueDate;
  }

  if (body.assigneeId !== undefined) {
    if (body.assigneeId === null) {
      updates.push(`"assigneeId" = NULL`);
    } else {
      updates.push(`"assigneeId" = $${idx++}`);
      values.push(body.assigneeId);
    }
    changes.assigneeId = body.assigneeId;
  }

  if (body.completionListId !== undefined) {
    if (body.completionListId === null) {
      updates.push(`"completionListId" = NULL`);
    } else {
      updates.push(`"completionListId" = $${idx++}`);
      values.push(body.completionListId);
    }
    changes.completionListId = body.completionListId;
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { error: "no valid fields to update" },
      { status: 400 },
    );
  }

  updates.push(`"updatedAt" = NOW()`);
  const sql = `UPDATE "Card" SET ${updates.join(", ")} WHERE "id" = $${idx}`;
  values.push(cardId);

  await prisma.$executeRawUnsafe(sql, ...values);

  // Fetch updated card
  const updated = await prisma.card.findUniqueOrThrow({
    where: { id: cardId },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Activity log
  logActivity({
    boardId: card.list.boardId,
    userId: user.id,
    action: "card.updated",
    entityType: "card",
    entityId: cardId,
    metadata: { cardTitle: updated.title, changes },
  });

  // Real-time broadcast (fire-and-forget)
  emitCardUpdated(card.list.boardId, user.id, cardId, changes);

  return NextResponse.json(updated);
}
