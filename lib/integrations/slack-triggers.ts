import prisma from "@/lib/prisma";
import { sendSlackMessage } from "./slack";

async function getSlackWebhookUrl(boardId: string): Promise<string | null> {
  const integration = await prisma.integration.findUnique({
    where: { boardId_type: { boardId, type: "slack" } },
  });
  if (!integration || !integration.isActive) return null;
  const config = integration.config as { webhookUrl?: string };
  return config.webhookUrl ?? null;
}

export async function slackCardCreated(
  boardId: string,
  card: { title: string; listTitle: string },
  user: { name: string },
): Promise<void> {
  try {
    const webhookUrl = await getSlackWebhookUrl(boardId);
    if (!webhookUrl) return;
    await sendSlackMessage(webhookUrl, {
      text: `🆕 *${user.name}* created "${card.title}" in ${card.listTitle}`,
    });
  } catch {
    // fire-and-forget
  }
}

export async function slackCardMoved(
  boardId: string,
  card: { title: string },
  fromList: string,
  toList: string,
  user: { name: string },
): Promise<void> {
  try {
    const webhookUrl = await getSlackWebhookUrl(boardId);
    if (!webhookUrl) return;
    await sendSlackMessage(webhookUrl, {
      text: `➡️ *${user.name}* moved "${card.title}" from ${fromList} → ${toList}`,
    });
  } catch {
    // fire-and-forget
  }
}

export async function slackCommentAdded(
  boardId: string,
  card: { title: string },
  comment: { message: string },
  user: { name: string },
): Promise<void> {
  try {
    const webhookUrl = await getSlackWebhookUrl(boardId);
    if (!webhookUrl) return;
    const preview =
      comment.message.length > 100
        ? comment.message.slice(0, 100) + "..."
        : comment.message;
    await sendSlackMessage(webhookUrl, {
      text: `💬 *${user.name}* commented on "${card.title}": ${preview}`,
    });
  } catch {
    // fire-and-forget
  }
}

export async function slackMemberAdded(
  boardId: string,
  member: { name: string },
  inviter: { name: string },
): Promise<void> {
  try {
    const webhookUrl = await getSlackWebhookUrl(boardId);
    if (!webhookUrl) return;
    await sendSlackMessage(webhookUrl, {
      text: `👋 *${inviter.name}* added *${member.name}* to the board`,
    });
  } catch {
    // fire-and-forget
  }
}
