import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { hashPassword, signFrankieToken, signSessionToken, tokenFromRequest, verifyPassword, verifyToken } from "@/lib/server/auth";

const user = { id: "u_1", name: "Ada", email: "ada@example.com" };

describe("passwords", () => {
  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong horse", stored)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("tokens", () => {
  it("accepts session tokens and the Frankie tokens Frankie forwards back", async () => {
    expect(await verifyToken(await signSessionToken(user))).toBe("u_1");
    expect(await verifyToken(await signFrankieToken(user))).toBe("u_1");
  });

  it("rejects tampered tokens, wrong audiences and foreign secrets", async () => {
    const good = await signSessionToken(user);
    expect(await verifyToken(good.slice(0, -2) + "xx")).toBeNull();
    const wrongAud = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u_1").setIssuer("polly").setAudience("someone-else").setExpirationTime("5m").sign(new TextEncoder().encode(process.env.POLLY_AUTH_SECRET!));
    expect(await verifyToken(wrongAud)).toBeNull();
    const foreign = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u_1").setIssuer("polly").setAudience("polly").setExpirationTime("5m").sign(new TextEncoder().encode("not-our-secret-not-our-secret-not-our-secret"));
    expect(await verifyToken(foreign)).toBeNull();
  });

  it("reads Bearer first, then the session cookie", () => {
    expect(tokenFromRequest(new Request("http://x", { headers: { authorization: "Bearer abc" } }))).toBe("abc");
    expect(tokenFromRequest(new Request("http://x", { headers: { cookie: "a=1; polly_session=def" } }))).toBe("def");
    expect(tokenFromRequest(new Request("http://x"))).toBeNull();
  });
});
