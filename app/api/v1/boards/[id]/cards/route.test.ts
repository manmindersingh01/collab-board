import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { GET, POST } from "./route";

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
const params = Promise.resolve({ id: "b1" });

function apiReq(method = "GET", body?: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/v1/boards/b1/cards", {
    method,
    headers: { Authorization: "Bearer cb_live_abc123", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/boards/[id]/cards", () => {
  it("returns 401 without API key", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ authenticated: false, error: "no key" });
    const res = await GET(apiReq(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when board not in workspace", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

    const res = await GET(apiReq(), { params });
    expect(res.status).toBe(404);
  });

  it("returns cards on success", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);
    vi.mocked(prisma.card.findMany).mockResolvedValue([
      { id: "c1", title: "Card 1", assignee: null },
    ] as never);

    const res = await GET(apiReq(), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /api/v1/boards/[id]/cards", () => {
  it("returns 401 without API key", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ authenticated: false, error: "no key" });
    const res = await POST(apiReq("POST", { title: "x", listId: "l1" }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 when title missing", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);

    const res = await POST(apiReq("POST", { listId: "l1" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when listId missing", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);

    const res = await POST(apiReq("POST", { title: "Card" }), { params });
    expect(res.status).toBe(400);
  });

  it("creates a card on success", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ id: "l1", boardId: "b1" } as never);
    vi.mocked(prisma.card.aggregate).mockResolvedValue({ _max: { position: 2 } } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never);
    vi.mocked(prisma.card.findUniqueOrThrow).mockResolvedValue({
      id: "c1", title: "New Card", position: 3, assignee: null,
    } as never);

    const res = await POST(apiReq("POST", { title: "New Card", listId: "l1" }), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.data.title).toBe("New Card");
  });
});
