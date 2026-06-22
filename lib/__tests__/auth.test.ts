// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret";
});

describe("auth", () => {
  it("hashes and verifies password", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth");
    const h = await hashPassword("hunter2");
    expect(h).not.toBe("hunter2");
    expect(await verifyPassword("hunter2", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });

  it("signs and verifies a session", async () => {
    const { signSession, verifySession } = await import("@/lib/auth");
    const token = await signSession({ userId: "u1" });
    expect((await verifySession(token))?.userId).toBe("u1");
    expect(await verifySession("garbage")).toBeNull();
  });
});
