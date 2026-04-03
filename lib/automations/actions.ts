import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

export async function executeSetField(
  cardId: string,
  field: string,
  value: unknown,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "Card" SET "${field}" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
    value,
    cardId,
  );
}

export async function executeMoveToList(
  cardId: string,
  listId: string,
): Promise<void> {
  const lastCard = await prisma.card.findFirst({
    where: { listId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = (lastCard?.position ?? 0) + 1;

  await prisma.$executeRawUnsafe(
    `UPDATE "Card" SET "listId" = $1, "position" = $2, "updatedAt" = NOW() WHERE "id" = $3`,
    listId,
    position,
    cardId,
  );
}

export async function executeAssign(
  cardId: string,
  userId: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "Card" SET "assigneeId" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
    userId,
    cardId,
  );
}

export async function executeUnassign(cardId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "Card" SET "assigneeId" = NULL, "updatedAt" = NOW() WHERE "id" = $1`,
    cardId,
  );
}

export async function executeAddLabel(
  cardId: string,
  label: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "Card" SET "labels" = array_append("labels", $1), "updatedAt" = NOW() WHERE "id" = $2`,
    label,
    cardId,
  );
}

export async function executeRemoveLabel(
  cardId: string,
  label: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "Card" SET "labels" = array_remove("labels", $1), "updatedAt" = NOW() WHERE "id" = $2`,
    label,
    cardId,
  );
}

export async function executeNotify(
  userId: string,
  message: string,
  link?: string,
): Promise<void> {
  await createNotification({
    userId,
    type: "automation",
    title: "Automation triggered",
    message,
    link,
  });
}

export async function executeAddComment(
  cardId: string,
  userId: string,
  message: string,
): Promise<void> {
  await prisma.comment.create({
    data: {
      cardId,
      authorid: userId,
      message,
    },
  });
}
