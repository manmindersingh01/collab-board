import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";

// Mock the slack module
vi.mock("./slack", () => ({
  sendSlackMessage: vi.fn(),
}));

import { sendSlackMessage } from "./slack";
import {
  slackCardCreated,
  slackCardMoved,
  slackCommentAdded,
  slackMemberAdded,
} from "./slack-triggers";

const mockSend = vi.mocked(sendSlackMessage);

const WEBHOOK_URL = "https://hooks.slack.com/services/T00/B00/xxx";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockActiveIntegration() {
  vi.mocked(prisma.integration.findUnique).mockResolvedValue({
    id: "int1",
    type: "slack",
    config: { webhookUrl: WEBHOOK_URL },
    isActive: true,
    boardId: "board1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function mockNoIntegration() {
  vi.mocked(prisma.integration.findUnique).mockResolvedValue(null);
}

function mockInactiveIntegration() {
  vi.mocked(prisma.integration.findUnique).mockResolvedValue({
    id: "int1",
    type: "slack",
    config: { webhookUrl: WEBHOOK_URL },
    isActive: false,
    boardId: "board1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("slackCardCreated", () => {
  it("sends a Slack message when integration is active", async () => {
    mockActiveIntegration();
    mockSend.mockResolvedValue(true);

    await slackCardCreated(
      "board1",
      { title: "Fix bug", listTitle: "To Do" },
      { name: "Alice" },
    );

    expect(mockSend).toHaveBeenCalledWith(WEBHOOK_URL, {
      text: expect.stringContaining("Alice"),
    });
    expect(mockSend).toHaveBeenCalledWith(WEBHOOK_URL, {
      text: expect.stringContaining("Fix bug"),
    });
  });

  it("does nothing when no integration exists", async () => {
    mockNoIntegration();

    await slackCardCreated(
      "board1",
      { title: "Fix bug", listTitle: "To Do" },
      { name: "Alice" },
    );

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does nothing when integration is inactive", async () => {
    mockInactiveIntegration();

    await slackCardCreated(
      "board1",
      { title: "Fix bug", listTitle: "To Do" },
      { name: "Alice" },
    );

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("slackCardMoved", () => {
  it("sends a Slack message with from/to lists", async () => {
    mockActiveIntegration();
    mockSend.mockResolvedValue(true);

    await slackCardMoved(
      "board1",
      { title: "Fix bug" },
      "To Do",
      "In Progress",
      { name: "Bob" },
    );

    expect(mockSend).toHaveBeenCalledWith(WEBHOOK_URL, {
      text: expect.stringContaining("To Do"),
    });
    expect(mockSend).toHaveBeenCalledWith(WEBHOOK_URL, {
      text: expect.stringContaining("In Progress"),
    });
  });

  it("does nothing when no integration", async () => {
    mockNoIntegration();

    await slackCardMoved(
      "board1",
      { title: "Fix bug" },
      "To Do",
      "Done",
      { name: "Bob" },
    );

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("slackCommentAdded", () => {
  it("sends a Slack message with comment preview", async () => {
    mockActiveIntegration();
    mockSend.mockResolvedValue(true);

    await slackCommentAdded(
      "board1",
      { title: "Fix bug" },
      { message: "Looks good to me" },
      { name: "Carol" },
    );

    expect(mockSend).toHaveBeenCalledWith(WEBHOOK_URL, {
      text: expect.stringContaining("Carol"),
    });
    expect(mockSend).toHaveBeenCalledWith(WEBHOOK_URL, {
      text: expect.stringContaining("Looks good to me"),
    });
  });

  it("truncates long comments", async () => {
    mockActiveIntegration();
    mockSend.mockResolvedValue(true);

    const longComment = "A".repeat(200);
    await slackCommentAdded(
      "board1",
      { title: "Fix bug" },
      { message: longComment },
      { name: "Carol" },
    );

    const call = mockSend.mock.calls[0];
    expect(call[1].text).toContain("...");
    expect(call[1].text.length).toBeLessThan(longComment.length + 100);
  });
});

describe("slackMemberAdded", () => {
  it("sends a Slack message about new member", async () => {
    mockActiveIntegration();
    mockSend.mockResolvedValue(true);

    await slackMemberAdded(
      "board1",
      { name: "Dave" },
      { name: "Alice" },
    );

    expect(mockSend).toHaveBeenCalledWith(WEBHOOK_URL, {
      text: expect.stringContaining("Alice"),
    });
    expect(mockSend).toHaveBeenCalledWith(WEBHOOK_URL, {
      text: expect.stringContaining("Dave"),
    });
  });

  it("does not throw when sendSlackMessage fails", async () => {
    mockActiveIntegration();
    mockSend.mockRejectedValue(new Error("Network error"));

    await expect(
      slackMemberAdded("board1", { name: "Dave" }, { name: "Alice" }),
    ).resolves.toBeUndefined();
  });
});
