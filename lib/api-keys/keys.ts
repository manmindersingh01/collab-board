import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";

const KEY_PREFIX = "cb_live_";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const random = randomBytes(16).toString("hex"); // 32 hex chars
  const raw = `${KEY_PREFIX}${random}`;
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 8);
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function validateApiKey(
  raw: string,
): Promise<{ valid: boolean; workspaceId?: string; userId?: string }> {
  const hash = hashApiKey(raw);

  const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });

  if (!key) return { valid: false };
  if (key.isRevoked) return { valid: false };
  if (key.expiresAt && key.expiresAt < new Date()) return { valid: false };

  return { valid: true, workspaceId: key.workspaceId, userId: key.createdById };
}
