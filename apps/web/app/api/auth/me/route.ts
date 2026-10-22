import { getRequestUser, publicUser } from "@/lib/server/auth";
import { route, unauthorized } from "@/lib/server/http";

export const GET = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  return Response.json({ user: publicUser(user) });
});
