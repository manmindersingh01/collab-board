import { createHmac } from "crypto";

/**
 * Verify a GitHub webhook signature (HMAC-SHA256).
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

export interface GitHubPREvent {
  type: "pr_opened" | "pr_merged";
  title: string;
  url: string;
  number: number;
  repo: string;
}

export interface GitHubCommentEvent {
  type: "issue_comment";
  body: string;
  issueNumber: number;
  issueTitle: string;
  url: string;
  repo: string;
  user: string;
}

export type ParsedGitHubEvent = GitHubPREvent | GitHubCommentEvent | null;

/**
 * Parse a GitHub webhook event into a structured format.
 */
export function parseGitHubEvent(
  eventType: string,
  payload: Record<string, unknown>,
): ParsedGitHubEvent {
  if (eventType === "pull_request") {
    const action = payload.action as string;
    const pr = payload.pull_request as Record<string, unknown>;
    if (!pr) return null;

    if (action === "opened") {
      return {
        type: "pr_opened",
        title: pr.title as string,
        url: pr.html_url as string,
        number: pr.number as number,
        repo: (payload.repository as Record<string, unknown>)
          ?.full_name as string,
      };
    }

    if (action === "closed" && pr.merged === true) {
      return {
        type: "pr_merged",
        title: pr.title as string,
        url: pr.html_url as string,
        number: pr.number as number,
        repo: (payload.repository as Record<string, unknown>)
          ?.full_name as string,
      };
    }
  }

  if (eventType === "issue_comment") {
    const action = payload.action as string;
    if (action !== "created") return null;

    const comment = payload.comment as Record<string, unknown>;
    const issue = payload.issue as Record<string, unknown>;
    if (!comment || !issue) return null;

    return {
      type: "issue_comment",
      body: comment.body as string,
      issueNumber: issue.number as number,
      issueTitle: issue.title as string,
      url: comment.html_url as string,
      repo: (payload.repository as Record<string, unknown>)
        ?.full_name as string,
      user: (comment.user as Record<string, unknown>)?.login as string,
    };
  }

  return null;
}
