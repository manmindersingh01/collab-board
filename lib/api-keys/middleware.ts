import { hashApiKey } from "./keys";
import prisma from "@/lib/prisma";

export async function authenticateApiKey(req: Request): Promise<{
  authenticated: boolean;
  workspaceId?: string;
  userId?: string;
  keyHash?: string;
  error?: string;
}> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing or invalid Authorization header" };
  }

  const raw = authHeader.slice(7);
  if (!raw.startsWith("cb_live_")) {
    return { authenticated: false, error: "Invalid API key format" };
  }

  const hash = hashApiKey(raw);
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });

  if (!key) {
    return { authenticated: false, error: "Invalid API key" };
  }

  if (key.isRevoked) {
    return { authenticated: false, error: "API key has been revoked" };
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return { authenticated: false, error: "API key has expired" };
  }

  // Update lastUsedAt (fire-and-forget)
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    authenticated: true,
    workspaceId: key.workspaceId,
    userId: key.createdById,
    keyHash: hash,
  };
}
