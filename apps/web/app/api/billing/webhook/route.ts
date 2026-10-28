import { saveSubscription, stripe, verifyWebhook } from "@/lib/server/billing";
import { route } from "@/lib/server/http";

// Stripe's webhook: subscription changes land on the user's billing record.
// Subscribe the endpoint to checkout.session.completed and
// customer.subscription.created / .updated / .deleted.
export const POST = route(async (req: Request) => {
  const event = verifyWebhook(await req.text(), req.headers.get("stripe-signature"));
  switch (event.type) {
    case "checkout.session.completed": {
      const id = event.data.object.subscription;
      if (typeof id === "string") await saveSubscription(await stripe().subscriptions.retrieve(id));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await saveSubscription(event.data.object);
      break;
  }
  return Response.json({ received: true });
});
