import Stripe from "stripe";
import { gamesCol, usersCol, type User } from "./schema";
import { HttpError } from "./http";
import { logEvent } from "./activity";

// Polly Studio Pro: $10 a month through Stripe. Everyone gets FREE_GAMES games
// or videos (editing them stays free); making more needs Pro.
//
// Env (all server only):
//   STRIPE_SECRET_KEY      sk_test_… locally, sk_live_… in production
//   STRIPE_PRICE_ID        the monthly price (scripts/stripe-setup.mjs makes it)
//   STRIPE_WEBHOOK_SECRET  whsec_… for /api/billing/webhook
// Without the key and price, billing is off and nobody is capped, so a deploy
// before Stripe is set up never locks anyone out.
//
// A user's subscription is mirrored on users/{uid}.billing by the webhook, and
// again when they come back from Checkout (so it works before the webhook does).

export const FREE_GAMES = 1;
export const PRO_PRICE_LABEL = "$10/month";

export type Billing = {
  // Pro given by an admin, with no subscription behind it
  comp?: boolean;
  customerId: string;
  subscriptionId: string | null;
  status: Stripe.Subscription.Status | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, "billing_not_configured", "Billing isn't set up on this server yet.");
  client ??= new Stripe(key);
  return client;
}

export const billingEnabled = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID;

const ACTIVE: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);
export const isPro = (b: Billing | null | undefined) => !!b?.comp || (!!b?.status && ACTIVE.has(b.status));

export async function getBilling(uid: string): Promise<Billing | null> {
  const d = (await usersCol().doc(uid).get()).get("billing");
  if (!d) return null;
  return { ...d, currentPeriodEnd: d.currentPeriodEnd?.toDate?.() ?? null };
}

export type Plan = { pro: boolean; enabled: boolean; used: number; limit: number | null; billing: Billing | null };

// What the person may make: Pro (or billing switched off) is unlimited.
export async function planFor(user: User): Promise<Plan> {
  const [billing, used] = await Promise.all([
    getBilling(user.id),
    gamesCol().where("ownerId", "==", user.id).count().get().then((s) => s.data().count),
  ]);
  const enabled = billingEnabled();
  const pro = user.admin || isPro(billing);
  return { pro, enabled, used, limit: enabled && !pro ? FREE_GAMES : null, billing };
}

// Called before every new game or video (starter, remix, Frankie's createGame).
export async function assertCanCreate(user: User): Promise<void> {
  if (!billingEnabled() || user.admin) return;
  const plan = await planFor(user);
  if (plan.limit !== null && plan.used >= plan.limit) {
    throw new HttpError(402, "payment_required",
      `The free plan includes ${FREE_GAMES} game or video. Upgrade to Polly Studio Pro (${PRO_PRICE_LABEL}) at /pricing to make more; you can keep editing the one you have.`);
  }
}

async function customerFor(user: User): Promise<string> {
  const existing = await getBilling(user.id);
  if (existing?.customerId) return existing.customerId;
  const customer = await stripe().customers.create({ email: user.email ?? undefined, name: user.name, metadata: { uid: user.id } });
  await usersCol().doc(user.id).set({ billing: { customerId: customer.id, subscriptionId: null, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false } }, { merge: true });
  return customer.id;
}

export async function checkoutUrl(user: User, origin: string): Promise<string> {
  const price = process.env.STRIPE_PRICE_ID;
  if (!price) throw new HttpError(503, "billing_not_configured", "Billing isn't set up on this server yet.");
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(user),
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    subscription_data: { metadata: { uid: user.id } },
    success_url: `${origin}/pricing?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
  });
  await logEvent("billing.checkout", user);
  return session.url!;
}

export async function portalUrl(user: User, origin: string): Promise<string> {
  const billing = await getBilling(user.id);
  if (!billing?.customerId) throw new HttpError(400, "no_subscription", "There's no subscription to manage yet.");
  const session = await stripe().billingPortal.sessions.create({ customer: billing.customerId, return_url: `${origin}/settings` });
  return session.url;
}

// Mirrors one subscription onto its user (found by the uid in its metadata,
// or by the customer id saved at checkout).
export async function saveSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let uid = sub.metadata?.uid;
  if (!uid) {
    const snap = await usersCol().where("billing.customerId", "==", customerId).limit(1).get();
    uid = snap.docs[0]?.id;
  }
  if (!uid) return;
  const end = sub.items.data[0]?.current_period_end;
  const billing: Billing = {
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: end ? new Date(end * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
  const before = (await usersCol().doc(uid).get()).get("billing.status") ?? null;
  await usersCol().doc(uid).set({ billing }, { merge: true });
  if (before !== billing.status) await logEvent("billing.subscription", uid, { detail: `${before ?? "none"} → ${billing.status}${billing.cancelAtPeriodEnd ? " (cancels at period end)" : ""}` });
}

// Back from Checkout: save the subscription now rather than wait for the webhook.
export async function syncCheckout(user: User, sessionId: string): Promise<boolean> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (session.client_reference_id !== user.id || !session.subscription || typeof session.subscription === "string") return false;
  await saveSubscription(session.subscription);
  return true;
}

export function verifyWebhook(body: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new HttpError(503, "billing_not_configured", "STRIPE_WEBHOOK_SECRET is not set.");
  if (!signature) throw new HttpError(400, "bad_signature", "Missing Stripe-Signature.");
  try {
    return stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    throw new HttpError(400, "bad_signature", "The Stripe signature didn't match.");
  }
}
