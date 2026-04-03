import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendSlackMessage } from "./slack";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendSlackMessage", () => {
  const webhookUrl = "https://hooks.slack.com/services/T00/B00/xxx";

  it("sends a message and returns true on success", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await sendSlackMessage(webhookUrl, { text: "Hello" });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello" }),
    });
  });

  it("sends a message with blocks", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const message = {
      text: "Fallback",
      blocks: [{ type: "section", text: { type: "mrkdwn", text: "*Bold*" } }],
    };
    const result = await sendSlackMessage(webhookUrl, message);

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  });

  it("returns false when the response is not ok", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await sendSlackMessage(webhookUrl, { text: "Hello" });

    expect(result).toBe(false);
  });

  it("returns false when fetch throws a network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await sendSlackMessage(webhookUrl, { text: "Hello" });

    expect(result).toBe(false);
  });
});
