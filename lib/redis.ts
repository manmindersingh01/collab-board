import Redis from "ioredis";

const globalForRedis = global as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

/**
 * Singleton Redis client for general use (caching, querying).
 * Do NOT use this for pub/sub subscriptions — ioredis requires
 * a dedicated client once subscribe() is called.
 */
const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export default redis;

/**
 * Create a fresh Redis client for pub/sub subscribers.
 * Each SSE connection needs its own subscriber client because
 * ioredis enters subscriber mode after the first subscribe() call.
 */
export function createSubscriber() {
  return createRedisClient();
}
