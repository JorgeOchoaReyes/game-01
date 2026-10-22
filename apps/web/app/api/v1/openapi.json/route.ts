import { openApiDocument } from "@/lib/server/openapi";
import { originOf } from "@/lib/server/http";

// Public on purpose: Frankie fetches this to build its tools for Polly.
export async function GET(req: Request) {
  return Response.json(openApiDocument(originOf(req)), { headers: { "access-control-allow-origin": "*" } });
}
