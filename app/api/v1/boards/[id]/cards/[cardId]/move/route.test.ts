import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/api-keys/middleware", () => ({
  authenticateApiKey: vi.fn(),
}));
vi.mock("@/lib/api-keys/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

import { authenticateApiKey } from "@/lib/api-keys/middleware";
import { checkRateLimit } from "@/lib/api-keys/rate-limit";

const validAuth = { authenticated: true, workspaceId: "ws1", userId: "user1", keyHash: "h" };
const rl = { allowed: true, remaining: 55, resetAt: new Date("2026-01-01T00:01:00Z") };
const params = Promise.resolve({ id: "b1", cardId: "c1" });

function apiReq(body?: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/v1/boards/b1/cards/c1/move", {
    method: "POST",
    headers: { Authorization: "Bearer cb_live_abc123", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : { body: JSON.stringify({}) }),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/v1/boards/[id]/cards/[cardId]/move", () => {
  it("returns 401 without API key", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ authenticated: false, error: "no" });
    const res = await POST(apiReq({ listId: "l1", position: 1 }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 when listId missing", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);
    vi.mocked(prisma.card.findUnique).mockResolvedValue({ id: "c1", listId: "l1", list: { boardId: "b1" } } as never);

    const res = await POST(apiReq({ position: 1 }), { params });
    expect(res.status).toBe(400);
  });

  it("moves card on success", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);
    vi.mocked(prisma.card.findUnique).mockResolvedValue({ id: "c1", listId: "l1", list: { boardId: "b1" } } as never);
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ id: "l2", boardId: "b1" } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never);
    vi.mocked(prisma.card.findUniqueOrThrow).mockResolvedValue({ id: "c1", title: "Card", assignee: null } as never);

    const res = await POST(apiReq({ listId: "l2", position: 1.5 }), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.data.id).toBe("c1");
  });
});
