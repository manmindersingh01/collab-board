import { vi } from "vitest";

// ── Mock Prisma ──────────────────────────────────────────
// Every test file gets a mocked prisma client by default.
// Override specific methods in individual tests with vi.mocked().

vi.mock("@/lib/prisma", () => {
  const createMockModel = () => ({
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  });

  return {
    default: {
      user: createMockModel(),
      board: createMockModel(),
      boardMember: createMockModel(),
      list: createMockModel(),
      card: createMockModel(),
      cardTemplate: createMockModel(),
      comment: createMockModel(),
      notification: createMockModel(),
      activityLog: createMockModel(),
      workspace: createMockModel(),
      workspaceMember: createMockModel(),
      automation: createMockModel(),
      integration: createMockModel(),
      apiKey: createMockModel(),
      webhookEndpoint: createMockModel(),
      timeEntry: createMockModel(),
      $transaction: vi.fn((fn: Function) => fn({
        card: createMockModel(),
        list: createMockModel(),
        boardMember: createMockModel(),
        ...createMockModel(),
      })),
      $executeRaw: vi.fn(),
      $executeRawUnsafe: vi.fn(),
      $queryRaw: vi.fn(),
      $queryRawUnsafe: vi.fn(),
    },
  };
});

// ── Mock Redis ──────────────────────────────────────────

vi.mock("@/lib/redis", () => ({
  default: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// ── Mock Clerk auth ──────────────────────────────────────

vi.mock("@/lib/user", () => ({
  getDbUser: vi.fn(),
}));

// ── Mock activity logger ─────────────────────────────────

vi.mock("@/lib/activity", () => ({
  logActivity: vi.fn(),
}));

// ── Mock realtime emitters ───────────────────────────────

vi.mock("@/lib/realtime-emitters", () => ({
  emitCardCreated: vi.fn(),
  emitCardMoved: vi.fn(),
  emitCardUpdated: vi.fn(),
  emitCardDeleted: vi.fn(),
  emitListCreated: vi.fn(),
}));

// ── Mock notify ──────────────────────────────────────────

vi.mock("@/lib/notify", () => ({
  createNotification: vi.fn(),
}));

// ── Helper: create a mock Next.js Request ────────────────

export function mockRequest(
  method: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost:3000/api/test", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Helper: parse a NextResponse ─────────────────────────

export async function parseResponse(res: Response) {
  const json = await res.json();
  return { status: res.status, body: json };
}
