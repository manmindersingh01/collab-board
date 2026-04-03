import redis from "@/lib/redis";

const RATE_LIMIT = 60; // requests per minute

export async function checkRateLimit(keyHash: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const now = new Date();
  const currentMinute = Math.floor(now.getTime() / 60000);
  const redisKey = `ratelimit:${keyHash}:${currentMinute}`;

  const count = await redis.incr(redisKey);

  // Set TTL on first request in this window
  if (count === 1) {
    await redis.expire(redisKey, 60);
  }

  const remaining = Math.max(0, RATE_LIMIT - count);
  const resetAt = new Date((currentMinute + 1) * 60000);

  return {
    allowed: count <= RATE_LIMIT,
    remaining,
    resetAt,
  };
}
