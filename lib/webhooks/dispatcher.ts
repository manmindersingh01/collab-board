import prisma from "@/lib/prisma";
import { signPayload } from "./signing";

const TIMEOUT_MS = 5000;

export async function dispatchWebhooks(
  boardId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  let endpoints;
  try {
    endpoints = await prisma.webhookEndpoint.findMany({
      where: { boardId, isActive: true },
    });
  } catch (e) {
    console.error("Failed to fetch webhook endpoints:", e);
    return;
  }

  // Filter to endpoints subscribed to this event
  const matching = endpoints.filter((ep) => ep.events.includes(event));

  await Promise.allSettled(
    matching.map((ep) => deliverWithRetry(ep.url, ep.secret, event, payload)),
  );
}

async function deliverWithRetry(
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const signature = signPayload(body, secret);

  const doFetch = () =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CollabBoard-Signature": signature,
        "X-CollabBoard-Event": event,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  try {
    const res = await doFetch();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (firstErr) {
    // Retry once
    try {
      const res = await doFetch();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (retryErr) {
      console.error(`Webhook delivery failed to ${url} for event ${event}:`, retryErr);
    }
  }
}
