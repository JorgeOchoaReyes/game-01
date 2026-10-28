import { getRequestUser } from "@/lib/server/auth";
import { planFor, syncCheckout } from "@/lib/server/billing";
import { route, unauthorized } from "@/lib/server/http";

// GET -> { pro, enabled, used, limit, status, currentPeriodEnd, cancelAtPeriodEnd }
// ?checkout=<session id> (the return from Stripe Checkout) saves that
// subscription first, so the plan is right before the webhook arrives.
export const GET = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user || user.anonymous) throw unauthorized();
  const session = new URL(req.url).searchParams.get("checkout");
  if (session) await syncCheckout(user, session).catch(() => false);
  const { billing, ...plan } = await planFor(user);
  return Response.json(
    { ...plan, status: billing?.status ?? null, currentPeriodEnd: billing?.currentPeriodEnd ?? null, cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false },
    { headers: { "cache-control": "no-store" } },
  );
});
