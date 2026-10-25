import { clearedSessionCookie } from "@/lib/server/auth";

// The browser also signs out of the Firebase SDK (see LogoutButton).
export async function POST() {
  return new Response(null, { status: 204, headers: { "set-cookie": clearedSessionCookie() } });
}
