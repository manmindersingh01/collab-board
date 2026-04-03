import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { GET } from "./route";

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

function apiReq() {
  return new Request("http://localhost:3000/api/v1/boards/b1", {
    headers: { Authorization: "Bearer cb_live_abc123" },
  });
}
const params = Promise.resolve({ id: "b1" });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/boards/[id]", () => {
  it("returns 401 with invalid key", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ authenticated: false, error: "Invalid" });
    const res = await GET(apiReq(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when board not found", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

    const res = await GET(apiReq(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 404 when board belongs to different workspace", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({
      id: "b1",
      workspaceId: "other-ws",
      list: [],
    } as never);

    const res = await GET(apiReq(), { params });
    expect(res.status).toBe(404);
  });

  it("returns board with lists and cards", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(validAuth);
    vi.mocked(checkRateLimit).mockResolvedValue(rl);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({
      id: "b1",
      name: "Board 1",
      workspaceId: "ws1",
      list: [{ id: "l1", title: "To Do", card: [] }],
    } as never);

    const res = await GET(apiReq(), { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.data.name).toBe("Board 1");
    expect(body.data.list).toHaveLength(1);
  });
});
