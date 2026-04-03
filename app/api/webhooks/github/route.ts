import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  verifyGitHubSignature,
  parseGitHubEvent,
} from "@/lib/integrations/github";

export async function POST(req: Request) {
  const eventType = req.headers.get("x-github-event");
  const signature = req.headers.get("x-hub-signature-256");

  if (!eventType || !signature) {
    return NextResponse.json(
      { error: "missing required headers" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Extract repo from payload to find the integration
  const repo = (payload.repository as Record<string, unknown>)
    ?.full_name as string;
  if (!repo) {
    return NextResponse.json(
      { error: "missing repository info" },
      { status: 400 },
    );
  }

  // Find all GitHub integrations for this repo
  const integrations = await prisma.integration.findMany({
    where: { type: "github", isActive: true },
  });

  const matching = integrations.find((i) => {
    const config = i.config as { repo?: string };
    return config.repo === repo;
  });

  if (!matching) {
    return NextResponse.json(
      { error: "no integration found for this repo" },
      { status: 404 },
    );
  }

  // Verify signature
  const config = matching.config as { webhookSecret?: string };
  if (
    !config.webhookSecret ||
    !verifyGitHubSignature(rawBody, signature, config.webhookSecret)
  ) {
    return NextResponse.json(
      { error: "invalid signature" },
      { status: 401 },
    );
  }

  // Parse the event
  const event = parseGitHubEvent(eventType, payload);
  if (!event) {
    // Unhandled event type — acknowledge but don't process
    return NextResponse.json({ ok: true, processed: false });
  }

  const boardId = matching.boardId;

  if (event.type === "pr_opened") {
    // Create a card in the first list
    const firstList = await prisma.list.findFirst({
      where: { boardId },
      orderBy: { position: "asc" },
    });

    if (firstList) {
      const agg = await prisma.card.aggregate({
        where: { listId: firstList.id },
        _max: { position: true },
      });
      const position = (agg._max.position ?? 0) + 1;
      const id = crypto.randomUUID();
      const now = new Date();

      await prisma.$executeRaw`
        INSERT INTO "Card" ("id", "title", "description", "position", "listId", "createdAt", "updatedAt")
        VALUES (${id}, ${`PR #${event.number}: ${event.title}`}, ${`[View PR](${event.url})`}, ${position}, ${firstList.id}, ${now}, ${now})
      `;
    }

    return NextResponse.json({ ok: true, processed: true, action: "card_created" });
  }

  if (event.type === "pr_merged") {
    // Find the card linked to this PR and move it to the last list (Done)
    const cards = await prisma.card.findMany({
      where: {
        title: { contains: `PR #${event.number}` },
        list: { boardId },
      },
    });

    if (cards.length > 0) {
      const lastList = await prisma.list.findFirst({
        where: { boardId },
        orderBy: { position: "desc" },
      });

      if (lastList) {
        const agg = await prisma.card.aggregate({
          where: { listId: lastList.id },
          _max: { position: true },
        });
        const position = (agg._max.position ?? 0) + 1;
        const now = new Date();

        for (const card of cards) {
          await prisma.$executeRaw`
            UPDATE "Card" SET "listId" = ${lastList.id}, "position" = ${position}, "updatedAt" = ${now}
            WHERE "id" = ${card.id}
          `;
        }
      }
    }

    return NextResponse.json({ ok: true, processed: true, action: "card_moved" });
  }

  if (event.type === "issue_comment") {
    // Find a card for this issue and add a comment
    const cards = await prisma.card.findMany({
      where: {
        title: { contains: `#${event.issueNumber}` },
        list: { boardId },
      },
    });

    if (cards.length > 0) {
      // Use the first matching card
      await prisma.comment.create({
        data: {
          cardId: cards[0].id,
          authorid: "system", // No real user for webhook comments
          message: `**${event.user}** commented on GitHub:\n\n${event.body}`,
        },
      });
    }

    return NextResponse.json({ ok: true, processed: true, action: "comment_added" });
  }

  return NextResponse.json({ ok: true, processed: false });
}
