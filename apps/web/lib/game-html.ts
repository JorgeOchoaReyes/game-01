// Turns a game's index.html into something the studio can run in a sandboxed
// iframe, without changing the file the player downloads.

export const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || "ws://localhost:8787";

export const usesThree = (html: string) => /vendor\/three\.min\.js/.test(html);
export const usesNet = (html: string) => /Kit\.net\.connect/.test(html);

type PreviewOptions = {
  room?: string;
  inviteBase?: string;
  // the studio listens for these to offer "ask Frankie to fix it"
  reportErrors?: boolean;
};

// <base> points relative vendor/ paths at the site's copy of the runtime; the
// globals hand Kit.net its relay, room and invite page (see game-kit.js).
export function preparePreview(html: string, opts: PreviewOptions = {}): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const globals: Record<string, string> = { GAMEKIT_RELAY: RELAY_URL };
  if (opts.room) globals.GAMEKIT_ROOM = opts.room;
  if (opts.inviteBase) globals.GAMEKIT_INVITE_BASE = opts.inviteBase;

  const errorHook = opts.reportErrors
    ? `window.addEventListener('error',function(e){parent.postMessage({pollyGameError:String(e.message)+(e.lineno?' (line '+e.lineno+')':'')},'*')});` +
      `window.addEventListener('unhandledrejection',function(e){parent.postMessage({pollyGameError:String(e.reason)},'*')});`
    : "";

  const head =
    `<base href="${origin}/runtime/">` +
    `<script>${Object.entries(globals).map(([k, v]) => `window.${k}=${JSON.stringify(v)};`).join("")}${errorHook}</script>`;

  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + head);
  return head + html;
}

// The game's <title>, for project names and zip file names.
export function gameTitle(html: string, fallback = "My game"): string {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return (m && m[1].trim()) || fallback;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game";
}
