import { clearedSessionCookie } from "@/lib/server/auth";

export async function POST() {
  return new Response(null, { status: 204, headers: { "set-cookie": clearedSessionCookie() } });
}
