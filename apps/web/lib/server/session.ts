import { cookies } from "next/headers";
import { SESSION_COOKIE, userFromToken } from "./auth";

// The signed-in user for server components and pages (cookie only).
export async function currentUser() {
  const jar = await cookies();
  return userFromToken(jar.get(SESSION_COOKIE)?.value);
}
