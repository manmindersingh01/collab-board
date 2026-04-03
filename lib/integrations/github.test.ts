import { describe, it, expect } from "vitest";
import { verifyGitHubSignature, parseGitHubEvent } from "./github";
import { createHmac } from "crypto";

describe("verifyGitHubSignature", () => {
  const secret = "test-secret";

  function sign(payload: string): string {
    return (
      "sha256=" + createHmac("sha256", secret).update(payload).digest("hex")
    );
  }

  it("returns true for a valid signature", () => {
    const payload = '{"action":"opened"}';
    const signature = sign(payload);
    expect(verifyGitHubSignature(payload, signature, secret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    const payload = '{"action":"opened"}';
    const signature = "sha256=" + "a".repeat(64);
    expect(verifyGitHubSignature(payload, signature, secret)).toBe(false);
  });

  it("returns false for mismatched length signature", () => {
    const payload = '{"action":"opened"}';
    expect(verifyGitHubSignature(payload, "sha256=short", secret)).toBe(false);
  });

  it("returns false for empty signature", () => {
    const payload = '{"action":"opened"}';
    expect(verifyGitHubSignature(payload, "", secret)).toBe(false);
  });
});

describe("parseGitHubEvent", () => {
  it("parses pull_request.opened", () => {
    const payload = {
      action: "opened",
      pull_request: {
        title: "Add feature",
        html_url: "https://github.com/org/repo/pull/1",
        number: 1,
        merged: false,
      },
      repository: { full_name: "org/repo" },
    };

    const result = parseGitHubEvent("pull_request", payload);
    expect(result).toEqual({
      type: "pr_opened",
      title: "Add feature",
      url: "https://github.com/org/repo/pull/1",
      number: 1,
      repo: "org/repo",
    });
  });

  it("parses pull_request.closed+merged", () => {
    const payload = {
      action: "closed",
      pull_request: {
        title: "Add feature",
        html_url: "https://github.com/org/repo/pull/1",
        number: 1,
        merged: true,
      },
      repository: { full_name: "org/repo" },
    };

    const result = parseGitHubEvent("pull_request", payload);
    expect(result).toEqual({
      type: "pr_merged",
      title: "Add feature",
      url: "https://github.com/org/repo/pull/1",
      number: 1,
      repo: "org/repo",
    });
  });

  it("returns null for pull_request.closed without merge", () => {
    const payload = {
      action: "closed",
      pull_request: {
        title: "Add feature",
        html_url: "https://github.com/org/repo/pull/1",
        number: 1,
        merged: false,
      },
      repository: { full_name: "org/repo" },
    };

    expect(parseGitHubEvent("pull_request", payload)).toBeNull();
  });

  it("parses issue_comment.created", () => {
    const payload = {
      action: "created",
      comment: {
        body: "LGTM",
        html_url: "https://github.com/org/repo/issues/1#comment-1",
        user: { login: "octocat" },
      },
      issue: { number: 1, title: "Bug report" },
      repository: { full_name: "org/repo" },
    };

    const result = parseGitHubEvent("issue_comment", payload);
    expect(result).toEqual({
      type: "issue_comment",
      body: "LGTM",
      issueNumber: 1,
      issueTitle: "Bug report",
      url: "https://github.com/org/repo/issues/1#comment-1",
      repo: "org/repo",
      user: "octocat",
    });
  });

  it("returns null for issue_comment with non-created action", () => {
    const payload = {
      action: "deleted",
      comment: { body: "LGTM", html_url: "...", user: { login: "x" } },
      issue: { number: 1, title: "Bug" },
      repository: { full_name: "org/repo" },
    };

    expect(parseGitHubEvent("issue_comment", payload)).toBeNull();
  });

  it("returns null for unknown event types", () => {
    expect(parseGitHubEvent("push", { ref: "refs/heads/main" })).toBeNull();
  });

  it("returns null for pull_request with missing PR object", () => {
    expect(
      parseGitHubEvent("pull_request", { action: "opened" }),
    ).toBeNull();
  });
});
