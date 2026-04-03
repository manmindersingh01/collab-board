import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { dispatchWebhooks } from "./dispatcher";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

const endpoint1 = {
  id: "ep1",
  url: "https://example.com/hook1",
  secret: "secret1",
  events: ["card.created", "card.moved"],
  isActive: true,
  boardId: "board1",
  createdById: "user1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const endpoint2 = {
  id: "ep2",
  url: "https://example.com/hook2",
  secret: "secret2",
  events: ["card.deleted"],
  isActive: true,
  boardId: "board1",
  createdById: "user1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("dispatchWebhooks", () => {
  it("dispatches to endpoints matching the event", async () => {
    vi.mocked(prisma.webhookEndpoint.findMany).mockResolvedValue([endpoint1, endpoint2]);
    mockFetch.mockResolvedValue({ ok: true });

    await dispatchWebhooks("board1", "card.created", { id: "c1" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://example.com/hook1");
  });

  it("skips endpoints not subscribed to the event", async () => {
    vi.mocked(prisma.webhookEndpoint.findMany).mockResolvedValue([endpoint2]);
    mockFetch.mockResolvedValue({ ok: true });

    await dispatchWebhooks("board1", "card.created", { id: "c1" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("includes signature and event headers", async () => {
    vi.mocked(prisma.webhookEndpoint.findMany).mockResolvedValue([endpoint1]);
    mockFetch.mockResolvedValue({ ok: true });

    await dispatchWebhooks("board1", "card.created", { id: "c1" });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["X-CollabBoard-Signature"]).toBeDefined();
    expect(opts.headers["X-CollabBoard-Event"]).toBe("card.created");
  });

  it("retries once on fetch failure then logs error", async () => {
    vi.mocked(prisma.webhookEndpoint.findMany).mockResolvedValue([endpoint1]);
    mockFetch.mockRejectedValue(new Error("network error"));

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await dispatchWebhooks("board1", "card.created", { id: "c1" });

    // 1 initial + 1 retry = 2 calls
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("retries once on non-ok response", async () => {
    vi.mocked(prisma.webhookEndpoint.findMany).mockResolvedValue([endpoint1]);
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true });

    await dispatchWebhooks("board1", "card.created", { id: "c1" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(prisma.webhookEndpoint.findMany).mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await dispatchWebhooks("board1", "card.created", { id: "c1" });

    expect(mockFetch).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
