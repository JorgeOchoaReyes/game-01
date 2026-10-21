import Anthropic from "@anthropic-ai/sdk";
import { streamFrankie, type ChatTurn } from "@frankie/frankie";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_HTML = 400_000;
const MAX_MESSAGE = 8_000;
const MAX_TURNS = 40;

type Body = { history?: ChatTurn[]; currentHtml?: string; message?: string };

// POST { history, currentHtml, message } -> streamed text/plain (Frankie's reply)
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return new Response("Frankie needs an ANTHROPIC_API_KEY on the server (see apps/web/.env.example).", { status: 503 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const message = (body.message || "").trim();
  const currentHtml = body.currentHtml || "";
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
    .slice(-MAX_TURNS);
  if (!message || message.length > MAX_MESSAGE || currentHtml.length > MAX_HTML) {
    return new Response("Message missing or too large", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const text of streamFrankie({ history, currentHtml, message })) {
          controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        let note = "Frankie hit a snag. Try again in a moment.";
        if (err instanceof Anthropic.RateLimitError) note = "Frankie is busy right now (rate limited). Try again in a minute.";
        else if (err instanceof Anthropic.AuthenticationError) note = "The server's Anthropic API key was rejected.";
        else if (err instanceof Anthropic.APIError) note = `Frankie hit an API error (${err.status}).`;
        else if (err instanceof Error) note = err.message;
        console.error("frankie:", err);
        controller.enqueue(encoder.encode(`\n\n[[frankie-error]] ${note}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
