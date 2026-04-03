import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { subscribeBoardEvents, type BoardEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

// ── GET /api/boards/[id]/events — SSE stream ───────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: boardId } = await params;

  // Verify board membership before opening stream
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  // Cleanup function is assigned inside start() and called in cancel().
  // Using a closure variable so cancel() can access it without hacking the controller.
  let cleanup: (() => Promise<void>) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`),
      );

      // Keep-alive: send a comment every 30s to prevent proxy/browser timeouts
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30_000);

      // Subscribe to Redis pub/sub for this board
      const subscription = await subscribeBoardEvents(
        boardId,
        (event: BoardEvent) => {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch {
            // Stream closed — cleanup handled in cancel()
          }
        },
      );

      cleanup = async () => {
        clearInterval(keepAlive);
        await subscription.unsubscribe();
      };
    },

    async cancel() {
      if (cleanup) await cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
