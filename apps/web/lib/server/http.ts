// Small helpers so every API route answers errors the same way:
// { error: { code, message } } with a matching HTTP status.

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new HttpError(404, "not_found", what);
export const unauthorized = () => new HttpError(401, "unauthorized", "Sign in first (send a Polly token as Authorization: Bearer, or the session cookie).");
export const badRequest = (message: string) => new HttpError(400, "bad_request", message);

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, init);
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: { code: err.code, message: err.message } }, { status: err.status });
  console.error("polly api:", err);
  return json({ error: { code: "internal", message: "Something went wrong on Polly's side." } }, { status: 500 });
}

// Wraps a route handler so thrown HttpErrors become proper responses.
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as T;
  } catch {
    throw badRequest("Send a JSON object body.");
  }
}

// The public origin links are built from: POLLY_PUBLIC_URL, else the request's own.
export function originOf(req: Request): string {
  if (process.env.POLLY_PUBLIC_URL) return process.env.POLLY_PUBLIC_URL.replace(/\/$/, "");
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

// Best-effort per-key limiter for auth endpoints (per server instance).
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return; }
  if (++b.count > max) throw new HttpError(429, "rate_limited", "Too many attempts. Wait a minute and try again.");
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
