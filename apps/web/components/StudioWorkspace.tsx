"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FrankieInline, FrankieProvider, useFrankieChat } from "@frankieai/react";
import "@frankieai/react/styles.css";
import { GameFrame } from "./GameFrame";
import { isPortrait, usesNet } from "@/lib/game-html";

type StudioGame = { id: string; title: string; version: number; visibility: "private" | "public"; html: string };
type Version = { version: number; title: string; note: string | null; createdAt: string };
type FrankieSettings = { publishableKey: string; baseUrl?: string };

const POLL_MS = 2500;

// Frankie (embedded through @frankieai/react) edits the game through Polly's
// API as the signed-in user. The studio polls the game and reloads the preview
// whenever a new version lands, whether Frankie or another tab saved it.
export function StudioWorkspace({ initial, frankie }: { initial: StudioGame; frankie: FrankieSettings | null }) {
  const [game, setGame] = useState(initial);
  const [runKey, setRunKey] = useState(0);
  const [room, setRoom] = useState("");
  // landscape games get the whole stage; portrait ones a phone-sized column
  const [full, setFull] = useState(() => !isPortrait(initial.html));
  const [gameError, setGameError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const etag = useRef<string | null>(null);
  const current = useRef(initial);

  const applyGame = useCallback((next: StudioGame, announce: boolean) => {
    if (next.html !== current.current.html) {
      setRunKey((k) => k + 1);
      setGameError(null);
      if (announce) setSavedNote(`Saved v${next.version}`);
    }
    current.current = next;
    setGame(next);
    setVersions(null);
  }, []);

  const refresh = useCallback(
    async (announce = true) => {
      const res = await fetch(`/api/v1/games/${initial.id}?include=html`, { headers: etag.current ? { "if-none-match": etag.current } : {} });
      if (res.status !== 200) return;
      etag.current = res.headers.get("etag");
      applyGame(await res.json(), announce);
    },
    [initial.id, applyGame],
  );

  useEffect(() => {
    void refresh(false);
    const t = setInterval(() => { if (!document.hidden) void refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!savedNote) return;
    const t = setTimeout(() => setSavedNote(null), 3000);
    return () => clearTimeout(t);
  }, [savedNote]);

  const save = async (patch: Partial<Pick<StudioGame, "visibility" | "title">>) => {
    const res = await fetch(`/api/v1/games/${game.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if (res.ok) await refresh(false);
  };

  const loadVersions = async () => {
    if (versions) return;
    const res = await fetch(`/api/v1/games/${game.id}/versions`);
    if (res.ok) setVersions((await res.json()).versions);
  };

  const restore = async (version: number) => {
    const res = await fetch(`/api/v1/games/${game.id}/versions/${version}/restore`, { method: "POST" });
    if (res.ok) await refresh();
  };

  const onGameError = useCallback((msg: string) => setGameError((cur) => cur ?? msg), []);

  const stage = (fixButton: ReactNode) => (
    <section className="stage">
      <div className="toolbar">
        <span className="title">{game.title}</span>
        {savedNote && <span className="saved">✓ {savedNote}</span>}
        <select
          aria-label="Version history"
          value=""
          onFocus={loadVersions}
          onMouseDown={loadVersions}
          onChange={(e) => e.target.value && restore(Number(e.target.value))}
        >
          <option value="">v{game.version} · history</option>
          {versions?.filter((v) => v.version !== game.version).map((v) => (
            <option key={v.version} value={v.version}>
              Restore v{v.version}{v.note ? ` · ${v.note}` : ""}
            </option>
          ))}
        </select>
        {usesNet(game.html) && (
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
            placeholder="Room code"
            aria-label="Multiplayer room code"
            title="Players who enter the same code join the same room"
          />
        )}
        <button className="btn small" onClick={() => { setGameError(null); setRunKey((k) => k + 1); }}>↻ Restart</button>
        <button className="btn small" onClick={() => setFull((f) => !f)}>{full ? "Phone size" : "Wide"}</button>
        <button className="btn small" onClick={() => save({ visibility: game.visibility === "public" ? "private" : "public" })}>
          {game.visibility === "public" ? "🌐 Public" : "🔒 Private"}
        </button>
        {game.visibility === "public" && <a className="btn small" href={`/g/${game.id}`} target="_blank" rel="noreferrer">Play page ↗</a>}
        <a className="btn small primary" href={`/api/v1/games/${game.id}/download`}>⬇ Download</a>
      </div>
      {gameError && (
        <div className="errbar">
          <span>⚠️ {gameError}</span>
          {fixButton}
        </div>
      )}
      <div className={`screen${full ? " full" : ""}`}>
        <GameFrame html={game.html} runKey={runKey} room={room || undefined} onError={onGameError} />
      </div>
    </section>
  );

  if (!frankie) {
    return (
      <div className="studio">
        <section className="chat">
          <div className="setup card">
            <h3>Connect Frankie</h3>
            <p>
              Frankie isn&apos;t configured on this server yet. Set <code>NEXT_PUBLIC_FRANKIE_PUBLISHABLE_KEY</code> and{" "}
              <code>FRANKIE_JWT_SECRET</code>, and connect your Frankie workspace to <code>/api/v1/openapi.json</code>. See{" "}
              <code>docs/FRANKIE.md</code>.
            </p>
            <p>You can still play, restore versions and download this game.</p>
          </div>
        </section>
        {stage(null)}
      </div>
    );
  }

  return (
    <FrankieChat settings={frankie} game={game}>
      <div className="studio">
        <section className="chat">
          <AutoAsk />
          <div className="chat-wrap">
            <FrankieInline placeholder="Tell Frankie what to build or change…" />
          </div>
        </section>
        {stage(gameError ? <FixWithFrankie error={gameError} /> : null)}
      </div>
    </FrankieChat>
  );
}

async function getUserToken(): Promise<string | null> {
  const res = await fetch("/api/frankie/token", { method: "POST" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message || "Could not get a Frankie token.");
  return (await res.json()).token;
}

// One Frankie conversation per game, and the game Frankie should work on is in
// the page context (gameId), as the Polly guide tells the agent.
function FrankieChat({ settings, game, children }: { settings: FrankieSettings; game: StudioGame; children: ReactNode }) {
  const context = useMemo(
    () => ({ page: "polly-studio", gameId: game.id, gameTitle: game.title, gameVersion: game.version }),
    [game.id, game.title, game.version],
  );
  return (
    <FrankieProvider
      publishableKey={settings.publishableKey}
      baseUrl={settings.baseUrl}
      getUserToken={getUserToken}
      conversationId={`polly-game-${game.id}`}
      context={context}
      // the studio is the user's own game: edits land at once, like a save
      approvals="auto"
    >
      {children}
    </FrankieProvider>
  );
}

// /studio/<id>?ask=… (from the "describe your game" box) sends that idea to
// Frankie once the chat is ready, then drops it from the address bar.
function AutoAsk() {
  const { send, restoring } = useFrankieChat();
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || restoring) return;
    const url = new URL(window.location.href);
    const ask = url.searchParams.get("ask")?.trim();
    if (!ask) return;
    sent.current = true;
    url.searchParams.delete("ask");
    window.history.replaceState(null, "", url.pathname + url.search);
    void send(ask);
  }, [send, restoring]);
  return null;
}

function FixWithFrankie({ error }: { error: string }) {
  const { send, busy } = useFrankieChat();
  return (
    <button className="btn small" disabled={busy} onClick={() => send(`The game preview shows this error: "${error}". Please read the game, fix it and save it.`)}>
      Ask Frankie to fix it
    </button>
  );
}
