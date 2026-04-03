export interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  [key: string]: unknown;
}

export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

/**
 * Send a message to a Slack webhook URL.
 * Returns true if the message was sent successfully, false otherwise.
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage,
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch {
    return false;
  }
}
