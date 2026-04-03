import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "@/tests/setup";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";
import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

const WEBHOOK_SECRET = "test-secret";

function sign(payload: string): string {
  return (
    "sha256=" +
    createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")
  );
}

function makeRequest(
  eventType: string,
  payload: Record<string, unknown>,
  secret = WEBHOOK_SECRET,
): Request {
  const body = JSON.stringify(payload);
  const signature = sign(body);
  return new Request("http://localhost:3000/api/webhooks/github", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-event": eventType,
      "x-hub-signature-256": signature,
    },
    body,
  });
}

const mockIntegration = {
  id: "int1",
  type: "github",
  config: { repo: "org/repo", token: "ghp_xxx", webhookSecret: WEBHOOK_SECRET },
  isActive: true,
  boardId: "board1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("POST /api/webhooks/github", () => {
  it("returns 400 when missing headers", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when missing repository info", async () => {
    const body = JSON.stringify({ action: "opened" });
    const req = new Request("http://localhost:3000/api/webhooks/github", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "pull_request",
        "x-hub-signature-256": sign(body),
      },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when no integration matches the repo", async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValue([]);

    const payload = {
      action: "opened",
      repository: { full_name: "org/repo" },
      pull_request: { title: "PR", html_url: "https://github.com/org/repo/pull/1", number: 1 },
    };
    const res = await POST(makeRequest("pull_request", payload));
    expect(res.status).toBe(404);
  });

  it("returns 401 when signature is invalid", async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValue([mockIntegration]);

    const payload = {
      action: "opened",
      repository: { full_name: "org/repo" },
      pull_request: { title: "PR", html_url: "https://github.com/org/repo/pull/1", number: 1 },
    };
    const body = JSON.stringify(payload);
    const req = new Request("http://localhost:3000/api/webhooks/github", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "pull_request",
        "x-hub-signature-256": "sha256=" + "a".repeat(64),
      },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates a card for pull_request.opened", async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValue([mockIntegration]);
    vi.mocked(prisma.list.findFirst).mockResolvedValue({
      id: "list1",
      title: "To Do",
      position: 1,
      boardId: "board1",
      createdAt: new Date(),
    });
    vi.mocked(prisma.card.aggregate).mockResolvedValue({
      _max: { position: 0 },
      _min: { position: 0 },
      _avg: { position: 0 },
      _sum: { position: 0 },
      _count: { position: 0 },
    } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);

    const payload = {
      action: "opened",
      pull_request: {
        title: "Add feature",
        html_url: "https://github.com/org/repo/pull/42",
        number: 42,
        merged: false,
      },
      repository: { full_name: "org/repo" },
    };

    const res = await POST(makeRequest("pull_request", payload));
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.processed).toBe(true);
    expect(body.action).toBe("card_created");
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it("moves a card for pull_request.merged", async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValue([mockIntegration]);
    vi.mocked(prisma.card.findMany).mockResolvedValue([
      {
        id: "card1",
        title: "PR #42: Add feature",
        description: null,
        position: 1,
        priority: "NONE",
        dueDate: null,
        labels: [],
        completionListId: null,
        isArchived: false,
        listId: "list1",
        assigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(prisma.list.findFirst).mockResolvedValue({
      id: "list-done",
      title: "Done",
      position: 3,
      boardId: "board1",
      createdAt: new Date(),
    });
    vi.mocked(prisma.card.aggregate).mockResolvedValue({
      _max: { position: 0 },
      _min: { position: 0 },
      _avg: { position: 0 },
      _sum: { position: 0 },
      _count: { position: 0 },
    } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);

    const payload = {
      action: "closed",
      pull_request: {
        title: "Add feature",
        html_url: "https://github.com/org/repo/pull/42",
        number: 42,
        merged: true,
      },
      repository: { full_name: "org/repo" },
    };

    const res = await POST(makeRequest("pull_request", payload));
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.processed).toBe(true);
    expect(body.action).toBe("card_moved");
  });

  it("adds a comment for issue_comment.created", async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValue([mockIntegration]);
    vi.mocked(prisma.card.findMany).mockResolvedValue([
      {
        id: "card1",
        title: "Issue #5: Bug report",
        description: null,
        position: 1,
        priority: "NONE",
        dueDate: null,
        labels: [],
        completionListId: null,
        isArchived: false,
        listId: "list1",
        assigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      id: "comment1",
      message: "**octocat** commented on GitHub:\n\nLGTM",
      cardId: "card1",
      authorid: "system",
      createdAt: new Date(),
    });

    const payload = {
      action: "created",
      comment: {
        body: "LGTM",
        html_url: "https://github.com/org/repo/issues/5#comment-1",
        user: { login: "octocat" },
      },
      issue: { number: 5, title: "Bug report" },
      repository: { full_name: "org/repo" },
    };

    const res = await POST(makeRequest("issue_comment", payload));
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.processed).toBe(true);
    expect(body.action).toBe("comment_added");
    expect(prisma.comment.create).toHaveBeenCalled();
  });

  it("returns processed:false for unhandled events", async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValue([mockIntegration]);

    const payload = {
      action: "completed",
      repository: { full_name: "org/repo" },
    };

    const res = await POST(makeRequest("check_run", payload));
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.processed).toBe(false);
  });
});
