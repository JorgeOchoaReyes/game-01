#!/usr/bin/env node
// Creates (or finds) Polly Studio Pro in Stripe: the product and its $10/month
// price, found again by lookup key so this is safe to run twice. With
// --webhook <url> it also registers that URL for subscription events and
// prints the signing secret once.
//
//   STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-setup.mjs
//   STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-setup.mjs --webhook https://pollystudio.app/api/billing/webhook
//
// Then set STRIPE_PRICE_ID (and STRIPE_WEBHOOK_SECRET) where the app runs.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("Set STRIPE_SECRET_KEY."); process.exit(1); }
const stripe = new Stripe(key);
const LOOKUP = "polly_pro_monthly";
const EVENTS = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"];

let price = (await stripe.prices.list({ lookup_keys: [LOOKUP], active: true, limit: 1 })).data[0];
if (!price) {
  const product = await stripe.products.create({
    name: "Polly Studio Pro",
    description: "Unlimited AI-built games and videos in Polly Studio.",
    tax_code: "txcd_10000000", // General - Electronically Supplied Services
  });
  price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: 1000, recurring: { interval: "month" }, lookup_key: LOOKUP });
  await stripe.products.update(product.id, { default_price: price.id });
}
console.log(`${key.startsWith("sk_live") ? "live" : "test"} mode`);
console.log(`STRIPE_PRICE_ID=${price.id}`);

const at = process.argv.indexOf("--webhook");
if (at > 0) {
  const url = process.argv[at + 1];
  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === url);
  if (existing) console.log(`Webhook for ${url} already exists (${existing.id}); its secret is in the Stripe dashboard.`);
  else console.log(`STRIPE_WEBHOOK_SECRET=${(await stripe.webhookEndpoints.create({ url, enabled_events: EVENTS })).secret}`);
}
