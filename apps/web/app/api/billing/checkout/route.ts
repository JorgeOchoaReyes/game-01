import { getRequestUser } from "@/lib/server/auth";
import { checkoutUrl } from "@/lib/server/billing";
import { originOf, route, unauthorized } from "@/lib/server/http";

// POST -> { url } of a Stripe Checkout page for Polly Studio Pro.
export const POST = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user || user.anonymous) throw unauthorized();
  return Response.json({ url: await checkoutUrl(user, originOf(req)) });
});
