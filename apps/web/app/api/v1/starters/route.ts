import { listStarters } from "@/lib/server/starters";

export async function GET() {
  return Response.json({ starters: listStarters() });
}
