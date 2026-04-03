import { describe, it, expect, vi, beforeEach } from "vitest";
import redis from "@/lib/redis";
import { checkRateLimit } from "./rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkRateLimit", () => {
  it("allows first request and sets TTL", async () => {
    vi.mocked(redis.incr).mockResolvedValue(1);
    vi.mocked(redis.expire).mockResolvedValue(1);

    const result = await checkRateLimit("hash123");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
    expect(result.resetAt).toBeInstanceOf(Date);
    expect(redis.expire).toHaveBeenCalled();
  });

  it("allows request at the limit (count=60)", async () => {
    vi.mocked(redis.incr).mockResolvedValue(60);

    const result = await checkRateLimit("hash123");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("rejects request over the limit (count=61)", async () => {
    vi.mocked(redis.incr).mockResolvedValue(61);

    const result = await checkRateLimit("hash123");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("does not set TTL after first request", async () => {
    vi.mocked(redis.incr).mockResolvedValue(5);

    await checkRateLimit("hash123");
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("returns a future resetAt", async () => {
    vi.mocked(redis.incr).mockResolvedValue(1);
    vi.mocked(redis.expire).mockResolvedValue(1);

    const result = await checkRateLimit("hash123");
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now() - 60000);
  });
});
