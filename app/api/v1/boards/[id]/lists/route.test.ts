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
  return new Request("http://localhost:3000/api/v1/boards/b1/lists", {
    method,
    headers: { Authorization: "Bearer cb_live_abc123", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/boards/[id]/lists", () => {
  it("returns 401 without API key", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ authenticated: false, error: "no" });
    const res = await GET(apiReq(), { params });
    expect(res.status).toBe(401);
  });

  it("returns lists on success", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);
    vi.mocked(prisma.list.findMany).mockResolvedValue([
      { id: "l1", title: "To Do", position: 1, _count: { card: 3 } },
    ] as never);

    const res = await GET(apiReq(), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /api/v1/boards/[id]/lists", () => {
  it("returns 400 when title missing", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);

    const res = await POST(apiReq("POST", {}), { params });
    expect(res.status).toBe(400);
  });

  it("creates list on success", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: "b1", workspaceId: "ws1" } as never);
    vi.mocked(prisma.list.aggregate).mockResolvedValue({ _max: { position: 3 } } as never);
    vi.mocked(prisma.list.create).mockResolvedValue({ id: "l2", title: "New List", position: 4, boardId: "b1" } as never);

    const res = await POST(apiReq("POST", { title: "New List" }), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.data.title).toBe("New List");
  });
});
