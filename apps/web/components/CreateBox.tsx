"use client";

import { useEffect, useRef, useState } from "react";

export type CreateMode = "game" | "video";
type Format = "portrait" | "landscape" | "square";

// Starting ideas, specific enough that Frankie can build something good from
// the first message. Four are shown, shuffled after the page loads.
const GAME_IDEAS = [
  "A top-down arena shooter: WASD to move, mouse to aim, survive waves of slimes",
  "A tower defense game where you place cannons and frost towers along a winding path",
  "A side-scrolling platformer with double jump, coins and a boss at the end",
  "A 3D survival game: gather wood and keep the campfire alive until dawn",
  "Breakout with power-ups, multiball and a boss brick that fights back",
  "A dungeon crawler with random rooms, keys, loot and a minimap",
  "An asteroid miner: fly with WASD, laser rocks, upgrade your ship between runs",
  "A twin-stick zombie survival game with a shop between nights",
  "A racing game on a twisty track for 2 players on one keyboard",
  "A snake game where you're a dragon that grows by eating knights",
  "An online capture-the-flag game for friends with invite links",
  "A cozy farming game: plant, water and sell crops before winter",
];
const VIDEO_IDEAS = [
  "How did the ancients cook food?",
  "Why is the sky blue? Explained in 45 seconds",
  "The life of a star, from cloud to supernova",
  "How do bees make honey?",
  "A day in the life of a Roman soldier",
  "How volcanoes erupt",
  "What happens to your body when you sleep",
  "How the pyramids were built",
  "The water cycle, told by a raindrop",
  "Why do cats purr?",
  "How a seed becomes a tree",
  "The history of the wheel in 60 seconds",
];
const SHOWN = 4;

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "portrait", label: "Short · 9:16", hint: "YouTube Shorts, TikTok, Reels" },
  { id: "landscape", label: "Landscape · 16:9", hint: "YouTube, presentations" },
  { id: "square", label: "Square · 1:1", hint: "Feeds and posts" },
];
const FORMAT_WORDS: Record<Format, string> = { portrait: "9:16 vertical short", landscape: "16:9 landscape video", square: "1:1 square video" };

function shuffled<T>(list: readonly T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The starter closest to the idea; Frankie turns it into the rest. Desktop
// action is the default; portrait only when the idea asks for a phone game.
function pickStarter(idea: string): string {
  if (/\b(online|multiplayer|with friends|co-?op|pvp|capture[- ]the[- ]flag)\b/i.test(idea)) return "coin-rush-multiplayer";
  if (/\b(3d|first[- ]person|third[- ]person|campfire|forest)\b/i.test(idea)) return "campfire-3d";
  if (/\b(phone|mobile|portrait|vertical|tap)\b/i.test(idea)) return "star-catcher";
  return "slime-arena";
}

// What Frankie is asked first. A video starts from the blank film, and Frankie
// builds it in small saves (title, helpers, then one scene each) at the file's
// markers, so the preview fills in scene by scene and one bad edit costs one step.
function firstMessage(mode: CreateMode, idea: string, format: Format): string {
  if (mode === "game") return idea;
  return `Make a ${FORMAT_WORDS[format]} about: ${idea}. The open video is a blank film built in steps; read its top comment and follow it. ` +
    `Plan 6 to 8 scenes first (one short punchy caption each), then save one step per editGame call: the title, any shared drawing helpers at // @helpers, ` +
    `then each scene at // @next-scene, in order, with every visual drawn on the canvas and a sound in enter(). ` +
    `Keep CFG.format as it is. If a save is refused, fix that step and carry on; keep going until every scene is in.`;
}

// "What do you want to make?" -> a new game or video open in the studio with
// Frankie already working on it. Making things needs an account: someone signed
// out goes to sign-up with the idea, and comes back to /studio to start it.
export function CreateBox({ signedIn, autoFocus = false, startWith, startMode = "game", startFormat = "portrait" }: {
  signedIn: boolean;
  autoFocus?: boolean;
  startWith?: string;
  startMode?: CreateMode;
  startFormat?: Format;
}) {
  const [mode, setMode] = useState<CreateMode>(startMode);
  const [format, setFormat] = useState<Format>(startFormat);
  const [idea, setIdea] = useState(startWith ?? "");
  const started = useRef(false);
  const pool = mode === "video" ? VIDEO_IDEAS : GAME_IDEAS;
  // the first few on the server, a fresh mix once in the browser
  const [ideas, setIdeas] = useState(() => pool.slice(0, SHOWN));
  useEffect(() => setIdeas(shuffled(pool).slice(0, SHOWN)), [pool]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(text: string) {
    const what = text.trim();
    if (!what || busy) return;
    if (!signedIn) {
      const back = `/studio?idea=${encodeURIComponent(what)}&mode=${mode}${mode === "video" ? `&format=${format}` : ""}`;
      window.location.href = `/signup?next=${encodeURIComponent(back)}`;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/games", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "video" ? { starterId: "blank-film", format, title: what.slice(0, 80) } : { starterId: pickStarter(what) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || "Couldn't make it.");
      window.location.href = `/studio/${body.id}?ask=${encodeURIComponent(firstMessage(mode, what, format))}`;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  // back from sign-up with an idea: start it
  useEffect(() => {
    if (!startWith || !signedIn || started.current) return;
    started.current = true;
    void start(startWith);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWith, signedIn]);

  const video = mode === "video";
  return (
    <div className="create">
      <div className="modes" role="tablist" aria-label="What to make">
        <button type="button" role="tab" aria-selected={!video} className={!video ? "on" : ""} onClick={() => setMode("game")} disabled={busy}>
          <span>🎮</span> Game
        </button>
        <button type="button" role="tab" aria-selected={video} className={video ? "on" : ""} onClick={() => setMode("video")} disabled={busy}>
          <span>🎬</span> Video
        </button>
      </div>
      <form
        className="create-box"
        onSubmit={(e) => {
          e.preventDefault();
          void start(idea);
        }}
      >
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void start(idea);
            }
          }}
          placeholder={video ? "What's your video about? A topic, a question, a story…" : "Describe the game you want to make…"}
          aria-label={video ? "What your video is about" : "Describe the game you want to make"}
          rows={2}
          maxLength={500}
          autoFocus={autoFocus}
          disabled={busy}
        />
        <button className="btn primary big" type="submit" disabled={busy || !idea.trim()}>
          {busy ? "Making it…" : signedIn ? "Make it ✨" : "Sign up & make it ✨"}
        </button>
      </form>
      {video && (
        <div className="formats" role="radiogroup" aria-label="Video format">
          {FORMATS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={format === f.id} className={`format ${f.id}${format === f.id ? " on" : ""}`} onClick={() => setFormat(f.id)} disabled={busy} title={f.hint}>
              <i aria-hidden />
              {f.label}
            </button>
          ))}
        </div>
      )}
      <div className="ideas">
        {ideas.map((i) => (
          <button key={i} type="button" className="chip" disabled={busy} onClick={() => { setIdea(i); void start(i); }}>
            {i}
          </button>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
