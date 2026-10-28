import { getRequestUser } from "@/lib/server/auth";
import { portalUrl } from "@/lib/server/billing";
import { originOf, route, unauthorized } from "@/lib/server/http";

// POST -> { url } of the Stripe customer portal: change card, cancel, invoices.
export const POST = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user || user.anonymous) throw unauthorized();
  return Response.json({ url: await portalUrl(user, originOf(req)) });
});
