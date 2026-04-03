import { NextResponse } from "next/server";
import { authenticateApiKey } from "./middleware";
import { checkRateLimit } from "./rate-limit";

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function apiSuccess(data: unknown, rateMeta: { remaining: number; resetAt: Date }) {
  return NextResponse.json({
    data,
    meta: { rateLimit: { remaining: rateMeta.remaining, resetAt: rateMeta.resetAt.toISOString() } },
  });
}

export function apiCreated(data: unknown, rateMeta: { remaining: number; resetAt: Date }) {
  return NextResponse.json(
    {
      data,
      meta: { rateLimit: { remaining: rateMeta.remaining, resetAt: rateMeta.resetAt.toISOString() } },
    },
    { status: 201 },
  );
}

export async function authenticateAndLimit(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) {
    return { error: apiError("UNAUTHORIZED", auth.error ?? "Invalid API key", 401) };
  }

  const rateLimit = await checkRateLimit(auth.keyHash!);
  if (!rateLimit.allowed) {
    return {
      error: apiError("RATE_LIMITED", "Rate limit exceeded", 429),
    };
  }

  return {
    workspaceId: auth.workspaceId!,
    userId: auth.userId!,
    rateLimit,
  };
}
