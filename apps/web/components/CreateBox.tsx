"use client";

import { useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { authErrorMessage, firebaseAuth } from "@/lib/firebase-client";

const IDEAS = [
  "A space shooter where a cat dodges asteroids",
  "A 3D survival game around a campfire at night",
  "A racing game for 2 players on one keyboard",
  "A platformer where you collect fish and avoid crabs",
];

// The starter closest to the idea; Frankie turns it into the rest.
function pickStarter(idea: string): string {
  if (/\b(online|multiplayer|with friends|co-?op|pvp)\b/i.test(idea)) return "coin-rush-multiplayer";
  if (/\b(3d|three|first[- ]person|survival|campfire|explore|world|forest)\b/i.test(idea)) return "campfire-3d";
  return "star-catcher";
}

// "What do you want to make?" -> a new game open in the studio with Frankie
// already working on the idea. Nobody hits a sign-up wall: people who aren't
// signed in become a guest first, and can save the account later.
export function CreateBox({ signedIn, autoFocus = false }: { signedIn: boolean; autoFocus?: boolean }) {
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(text: string) {
    const ask = text.trim();
    if (!ask || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!signedIn) {
        const cred = await signInAnonymously(firebaseAuth());
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken: await cred.user.getIdToken() }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message || "Couldn't start a session.");
      }
      const res = await fetch("/api/v1/games", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starterId: pickStarter(ask) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || "Couldn't make the game.");
      window.location.href = `/studio/${body.id}?ask=${encodeURIComponent(ask)}`;
    } catch (err) {
      setError((err as { code?: string }).code ? authErrorMessage(err) : (err as Error).message);
      setBusy(false);
    }
  }

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
          {busy ? "Making it…" : "Make it ✨"}
        </button>
      </form>
      <div className="ideas">
        {IDEAS.map((i) => (
          <button key={i} type="button" className="chip" disabled={busy} onClick={() => { setIdea(i); void start(i); }}>
            {i}
          </button>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
