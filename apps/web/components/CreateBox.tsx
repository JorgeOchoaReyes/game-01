"use client";

import { useEffect, useRef, useState } from "react";

// Starting ideas, specific enough that Frankie can build something fun from
// the first message. Six are shown, shuffled after the page loads.
const IDEAS = [
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
const SHOWN = 6;

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

// "What do you want to make?" -> a new game open in the studio with Frankie
// already working on the idea. Making games needs an account: someone signed
// out goes to sign-up with the idea, and comes back here to start it
// (`startWith`, from /studio?idea=…).
export function CreateBox({ signedIn, autoFocus = false, startWith }: { signedIn: boolean; autoFocus?: boolean; startWith?: string }) {
  const [idea, setIdea] = useState(startWith ?? "");
  const started = useRef(false);
  // the first six on the server, a fresh mix once in the browser
  const [ideas, setIdeas] = useState(() => IDEAS.slice(0, SHOWN));
  useEffect(() => setIdeas(shuffled(IDEAS).slice(0, SHOWN)), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(text: string) {
    const ask = text.trim();
    if (!ask || busy) return;
    if (!signedIn) {
      window.location.href = `/signup?next=${encodeURIComponent(`/studio?idea=${encodeURIComponent(ask)}`)}`;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/games", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starterId: pickStarter(ask) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || "Couldn't make the game.");
      window.location.href = `/studio/${body.id}?ask=${encodeURIComponent(ask)}`;
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

  return (
    <div className="create">
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
          placeholder="Describe the game you want to make…"
          aria-label="Describe the game you want to make"
          rows={2}
          maxLength={500}
          autoFocus={autoFocus}
          disabled={busy}
        />
        <button className="btn primary big" type="submit" disabled={busy || !idea.trim()}>
          {busy ? "Making it…" : signedIn ? "Make it ✨" : "Sign up & make it ✨"}
        </button>
      </form>
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
