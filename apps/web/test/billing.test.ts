import { afterEach, describe, expect, it } from "vitest";
import { createGame } from "@/lib/server/games";
import { planFor } from "@/lib/server/billing";
import { HttpError } from "@/lib/server/http";
import { usersCol } from "@/lib/server/schema";
import { account } from "./firebase-helpers";

const html = (title: string) => `<!DOCTYPE html><html><head><title>${title}</title></head><body><script>var x=1;</script></body></html>`;

async function code(p: Promise<unknown>): Promise<string> {
  try { await p; return "ok"; } catch (e) { if (e instanceof HttpError) return e.code; throw e; }
}

// planFor and the cap never call Stripe, so placeholder keys are enough here.
function billingOn() {
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  process.env.STRIPE_PRICE_ID = "price_placeholder";
}
afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_ID;
});

describe("the free plan", () => {
  it("caps nobody while billing is off", async () => {
    const me = await account();
    expect(await code(createGame(me, { html: html("One") }))).toBe("ok");
    expect(await code(createGame(me, { html: html("Two") }))).toBe("ok");
    expect((await planFor(me)).limit).toBeNull();
  });

  it("allows one game or video, then asks for Pro", async () => {
    billingOn();
    const me = await account();
    expect(await code(createGame(me, { html: html("One") }))).toBe("ok");
    expect(await code(createGame(me, { html: html("Two") }))).toBe("payment_required");
    expect(await planFor(me)).toMatchObject({ pro: false, used: 1, limit: 1 });
  });

  it("lets Pro make as many as they like, and caps again once it ends", async () => {
    billingOn();
    const me = await account();
    await createGame(me, { html: html("One") });
    const billing = { customerId: "cus_test", subscriptionId: "sub_test", status: "active", currentPeriodEnd: new Date(), cancelAtPeriodEnd: false };
    await usersCol().doc(me.id).set({ billing }, { merge: true });
    expect(await code(createGame(me, { html: html("Two") }))).toBe("ok");
    expect(await planFor(me)).toMatchObject({ pro: true, limit: null });

    await usersCol().doc(me.id).set({ billing: { ...billing, status: "canceled" } }, { merge: true });
    expect(await code(createGame(me, { html: html("Three") }))).toBe("payment_required");
  });
});
