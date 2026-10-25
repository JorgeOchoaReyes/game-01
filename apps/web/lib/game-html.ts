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

// Whether a game is laid out for a phone: its canvas is taller than wide
// (`w: 540, h: 960` in CFG, or width/height passed to Kit.canvas). Games are
// landscape unless they say otherwise.
export function isPortrait(html: string): boolean {
  if (isFilm(html)) return filmFormat(html) === "portrait";
  const m = html.match(/\bw(?:idth)?\s*:\s*(\d{3,4})\s*,\s*h(?:eight)?\s*:\s*(\d{3,4})/);
  return !!m && Number(m[2]) > Number(m[1]);
}

// Films (animations and explainer videos) are games built on Kit.film. Their
// shape is CFG.format: a 9:16 short, 16:9 landscape, or square.
export type FilmFormat = "portrait" | "landscape" | "square";
export const FILM_FORMATS: { id: FilmFormat; label: string }[] = [
  { id: "portrait", label: "9:16 Short" },
  { id: "landscape", label: "16:9 Landscape" },
  { id: "square", label: "1:1 Square" },
];

export const isFilm = (html: string) => /\bKit\.film\s*\(/.test(html);

export function filmFormat(html: string): FilmFormat {
  const m = html.match(/\bformat\s*:\s*['"](portrait|landscape|square)['"]/);
  return (m?.[1] as FilmFormat) ?? "portrait";
}

// The same film in another shape, or null when it has no format setting to change.
export function withFilmFormat(html: string, format: FilmFormat): string | null {
  const re = /(\bformat\s*:\s*['"])(portrait|landscape|square)(['"])/;
  return re.test(html) ? html.replace(re, `$1${format}$3`) : null;
}
