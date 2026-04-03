import { describe, it, expect } from "vitest";
import { signPayload, verifySignature } from "./signing";

describe("signPayload", () => {
  it("returns a hex string", () => {
    const sig = signPayload("hello", "secret");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic (same input = same signature)", () => {
    expect(signPayload("data", "key")).toBe(signPayload("data", "key"));
  });

  it("produces different signatures for different payloads", () => {
    expect(signPayload("a", "secret")).not.toBe(signPayload("b", "secret"));
  });

  it("produces different signatures for different secrets", () => {
    expect(signPayload("data", "secret1")).not.toBe(signPayload("data", "secret2"));
  });
});

describe("verifySignature", () => {
  it("returns true for matching signature (round-trip)", () => {
    const sig = signPayload("payload", "mysecret");
    expect(verifySignature("payload", sig, "mysecret")).toBe(true);
  });

  it("returns false for wrong secret", () => {
    const sig = signPayload("payload", "right-secret");
    expect(verifySignature("payload", sig, "wrong-secret")).toBe(false);
  });

  it("returns false for tampered payload", () => {
    const sig = signPayload("original", "secret");
    expect(verifySignature("tampered", sig, "secret")).toBe(false);
  });

  it("returns false for completely wrong signature", () => {
    expect(verifySignature("data", "not-a-valid-sig", "secret")).toBe(false);
  });
});
