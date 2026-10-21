import Anthropic from "@anthropic-ai/sdk";
import { GAME_KIT_REFERENCE, GAME_PRACTICES } from "./practices.ts";

export { GAME_KIT_REFERENCE, GAME_PRACTICES };

export const FRANKIE_MODEL = "claude-opus-5-5";

// Frozen so the prompt cache hits on every turn: nothing here may vary per request.
export const FRANKIE_SYSTEM_PROMPT = `You are Frankie, a friendly game-making partner inside the Frankie studio. People describe a game in plain words and you build it, then keep changing it with them turn by turn until it is fun.

Every reply has two parts:
1. One to three short sentences, in a warm and plain voice, saying what you made or changed and one idea they could try next. No headings, no lists of every change.
2. The COMPLETE, updated game as a single \`\`\`html code block. Always the whole file, never a diff or a fragment, because it is loaded into the live preview and the download exactly as you write it.

If the person only asks a question and no change is needed, answer briefly and leave out the code block.

The game you are given in <current_game> is what the person is playing right now. Build on it: keep what works, change what they asked for. If they ask for something completely different, start a fresh file but follow the same structure.

Write games that work the first time. Before you finish, re-read your code for undefined variables, typos in Kit calls, and missing win / lose / restart paths. Prefer a smaller game that runs over a bigger one that might not.

${GAME_PRACTICES}

${GAME_KIT_REFERENCE}`;

export type ChatTurn = { role: "user" | "assistant"; content: string };

const CODE_BLOCK = /```html\s*\n([\s\S]*?)(```|$)/g;

// Pull the last ```html block out of Frankie's reply. Works on a reply that is
// still streaming in: `complete` says whether the closing fence has arrived.
export function extractGameHtml(text: string): { html: string; complete: boolean } | null {
  let last: { html: string; complete: boolean } | null = null;
  for (const m of text.matchAll(CODE_BLOCK)) {
    last = { html: m[1].trimEnd(), complete: m[2] === "```" };
  }
  return last;
}

// Frankie's chat text without the code (what the chat bubble shows).
export function stripGameHtml(text: string): string {
  return text.replace(CODE_BLOCK, "").trim();
}

// Earlier turns carry only the conversation, never old copies of the game: the
// current game travels once, in the newest user message. That keeps requests
// small however long the session runs.
export function buildMessages(history: ChatTurn[], currentHtml: string, userMessage: string): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = history.map((turn) => ({
    role: turn.role,
    content: turn.role === "assistant" ? stripGameHtml(turn.content) || "(updated the game)" : turn.content,
  }));
  messages.push({
    role: "user",
    content: `<current_game>\n${currentHtml}\n</current_game>\n\n${userMessage}`,
  });
  return messages;
}

export type FrankieRequest = {
  history: ChatTurn[];
  currentHtml: string;
  message: string;
  client?: Anthropic;
};

// Streams Frankie's reply as text deltas. Throws Anthropic.APIError subclasses
// on API failures and a plain Error when the model declines the request.
export async function* streamFrankie(req: FrankieRequest): AsyncGenerator<string> {
  const client = req.client ?? new Anthropic();
  const stream = client.beta.messages.stream({
    model: FRANKIE_MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    cache_control: { type: "ephemeral" },
    system: FRANKIE_SYSTEM_PROMPT,
    messages: buildMessages(req.history, req.currentHtml, req.message),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    throw new Error("Frankie can't help with that one. Try describing a different game.");
  }
}
