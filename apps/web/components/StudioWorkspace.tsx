"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FrankieInline, FrankieProvider, useFrankieChat, type ToolActivity } from "@frankieai/react";
import "@frankieai/react/styles.css";
import { GameFrame, saveFile } from "./GameFrame";
import { FILM_FORMATS, filmFormat, isFilm, isPortrait, usesNet, withFilmFormat, type FilmFormat } from "@/lib/game-html";

type StudioGame = { id: string; title: string; version: number; visibility: "private" | "public"; html: string };
type Version = { version: number; title: string; note: string | null; createdAt: string };
type FrankieSettings = { publishableKey: string; baseUrl?: string };

const POLL_MS = 2500;

// Frankie (embedded through @frankieai/react) edits the game through Polly's
// API as the signed-in user. The studio polls the game and reloads the preview
// whenever a new version lands, whether Frankie or another tab saved it. When
// Frankie makes a brand-new game, the stage switches to it beside the same chat.
export function StudioWorkspace({ initial, frankie }: { initial: StudioGame; frankie: FrankieSettings | null }) {
  const [game, setGame] = useState(initial);
  const [gameId, setGameId] = useState(initial.id);
  const [runKey, setRunKey] = useState(0);
  const [room, setRoom] = useState("");
  // landscape games get the whole stage; portrait ones a phone-sized column
  const [full, setFull] = useState(() => !isPortrait(initial.html));
  const [gameError, setGameError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [recordKey, setRecordKey] = useState(0);
  const [recording, setRecording] = useState(false);
  // the film's voiceover: null = none; status for the button
  const [voice, setVoice] = useState<{ scene: number; data: ArrayBuffer }[] | null>(null);
  const [voiceState, setVoiceState] = useState<"off" | "loading" | "on" | "connect">("off");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const film = isFilm(game.html);
  const etag = useRef<string | null>(null);
  const current = useRef(initial);

  const applyGame = useCallback((next: StudioGame, announce: boolean) => {
    if (next.id !== current.current.id) {
      setRunKey((k) => k + 1);
      setGameError(null);
      setFull(!isPortrait(next.html));
      setSavedNote(`Opened ${next.title}`);
    } else if (next.html !== current.current.html) {
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
      const res = await fetch(`/api/v1/games/${gameId}?include=html`, { headers: etag.current ? { "if-none-match": etag.current } : {} });
      if (res.status !== 200) return;
      etag.current = res.headers.get("etag");
      applyGame(await res.json(), announce);
    },
    [gameId, applyGame],
  );

  // Frankie made a new game: show it here and keep the conversation going
  const openGame = useCallback((id: string) => {
    if (id === current.current.id) return;
    etag.current = null;
    setGameId(id);
    window.history.replaceState(null, "", `/studio/${id}`);
  }, []);

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

  // films change shape by rewriting CFG.format, saved as a new version
  const setFormat = async (format: FilmFormat) => {
    const html = withFilmFormat(game.html, format);
    if (!html) return;
    const res = await fetch(`/api/v1/games/${game.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ html, baseVersion: game.version, note: `Format: ${format}` }),
    });
    if (res.ok) {
      setFull(format !== "portrait");
      await refresh();
    }
  };

  // reads every scene's caption aloud with the user's own ElevenLabs voice
  const toggleVoice = async () => {
    if (voiceState === "on") { setVoice(null); setVoiceState("off"); return; }
    setVoiceState("loading");
    setVoiceError(null);
    const res = await fetch(`/api/games/${game.id}/narration`, { method: "POST" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setVoiceState(body?.error?.code === "elevenlabs_not_connected" ? "connect" : "off");
      setVoiceError(body?.error?.message || "Couldn't make the voiceover.");
      return;
    }
    setVoice((body.clips as { scene: number; audio: string }[]).map((c) => {
      const bin = atob(c.audio), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { scene: c.scene, data: bytes.buffer };
    }));
    setVoiceState("on");
    setSavedNote("Voiceover ready");
  };

  const startRecording = () => {
    setRecording(true);
    setRecordKey((k) => k + 1);
  };
  const onVideo = useCallback((video: Blob, name: string) => {
    saveFile(video, name);
    setRecording(false);
    setSavedNote("Video downloaded");
  }, []);

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

  const stage = (fixButton: ReactNode, building: ReactNode = null) => (
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
        {film && (
          <select aria-label="Video format" value={filmFormat(game.html)} onChange={(e) => setFormat(e.target.value as FilmFormat)} disabled={recording}>
            {FILM_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        )}
        {film && (
          voiceState === "connect" ? (
            <a className="btn small" href="/settings" title={voiceError ?? undefined}>🎙 Connect ElevenLabs</a>
          ) : (
            <button className={`btn small${voiceState === "on" ? " primary" : ""}`} onClick={() => void toggleVoice()} disabled={voiceState === "loading" || recording} title={voiceError ?? "Narrate each scene's caption with your ElevenLabs voice"}>
              {voiceState === "loading" ? "🎙 Writing voiceover…" : voiceState === "on" ? "🎙 Voiceover on" : "🎙 Voiceover"}
            </button>
          )
        )}
        {film && (
          <button className="btn small rec" onClick={startRecording} disabled={recording} title="Plays the video once from the start and saves it as a file">
            {recording ? "⏺ Recording… let it play" : "⏺ Record video"}
          </button>
        )}
        <button className="btn small" onClick={() => { setGameError(null); setRunKey((k) => k + 1); }}>↻ Restart</button>
        {!film && <button className="btn small" onClick={() => setFull((f) => !f)}>{full ? "Phone size" : "Wide"}</button>}
        <button className="btn small" onClick={() => save({ visibility: game.visibility === "public" ? "private" : "public" })}>
          {game.visibility === "public" ? "🌐 Public" : "🔒 Private"}
        </button>
        {game.visibility === "public" && <a className="btn small" href={`/g/${game.id}`} target="_blank" rel="noreferrer">Play page ↗</a>}
        <a className="btn small primary" href={`/api/v1/games/${game.id}/download`}>⬇ Download</a>
      </div>
      {voiceError && voiceState === "off" && (
        <div className="errbar">
          <span>🎙 {voiceError}</span>
          <button className="btn small" onClick={() => setVoiceError(null)}>OK</button>
        </div>
      )}
      {building}
      {gameError && (
        <div className="errbar">
          <span>⚠️ {gameError}</span>
          {fixButton}
        </div>
      )}
      <div className={`screen${full ? " full" : ""}`}>
        <GameFrame html={game.html} runKey={runKey} room={room || undefined} onError={onGameError} record={recordKey} onVideo={onVideo} voice={film ? voice : undefined} />
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
    <FrankieChat settings={frankie} game={game} conversationGameId={initial.id}>
      <div className="studio">
        <section className="chat">
          <AutoAsk />
          <WatchTools gameId={game.id} onNewGame={openGame} onSaved={refresh} />
          <div className="chat-wrap">
            <FrankieInline placeholder="Tell Frankie what to build or change…" />
          </div>
        </section>
        {stage(gameError ? <FixWithFrankie error={gameError} /> : null, <BuildingBar />)}
      </div>
    </FrankieChat>
  );
}

async function getUserToken(): Promise<string | null> {
  const res = await fetch("/api/frankie/token", { method: "POST" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message || "Could not get a Frankie token.");
  return (await res.json()).token;
}

// One Frankie conversation per game the studio was opened on (it carries on
// when Frankie switches to a game it just made), and the game Frankie should
// work on is in the page context (gameId), as the Polly guide tells the agent.
function FrankieChat({ settings, game, conversationGameId, children }: { settings: FrankieSettings; game: StudioGame; conversationGameId: string; children: ReactNode }) {
  const api = useMemo(
    () => (typeof window === "undefined" ? undefined : { baseUrl: `${window.location.origin}/api/v1`, credentials: "same-origin" as const }),
    [],
  );
  const context = useMemo(
    () => ({ page: "polly-studio", gameId: game.id, gameTitle: game.title, gameVersion: game.version }),
    [game.id, game.title, game.version],
  );
  return (
    <FrankieProvider
      publishableKey={settings.publishableKey}
      baseUrl={settings.baseUrl}
      getUserToken={getUserToken}
      // tool calls go to the API of whichever site this is (localhost or production), with its cookie
      api={api}
      conversationId={`polly-game-${conversationGameId}`}
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

// POST /games answers 201 with the new game's id first ({"id":"…"), so the id
// survives even when the activity row's body was cut.
function createdGameId(tool: ToolActivity): string | null {
  const call = tool.call;
  if (tool.status !== "done" || !call || call.request.method.toUpperCase() !== "POST" || call.response?.status !== 201) return null;
  if (!/\/games\/?(\?|$)/.test(call.request.url)) return null;
  return call.response.body?.match(/"id"\s*:\s*"([\w-]+)"/)?.[1] ?? null;
}

// Follows Frankie's tool calls as they finish: a new game opens on the stage,
// and a save to the current one reloads it now instead of at the next poll.
// Calls already in the transcript when the chat restores are left alone.
function WatchTools({ gameId, onNewGame, onSaved }: { gameId: string; onNewGame: (id: string) => void; onSaved: () => void }) {
  const { messages, restoring } = useFrankieChat();
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (restoring) return;
    const tools = messages.flatMap((m) => (m.role === "assistant" ? m.tools : []));
    if (!seen.current) {
      seen.current = new Set(tools.filter((t) => t.status !== "running").map((t) => t.id));
      return;
    }
    for (const tool of tools) {
      if (tool.status === "running" || seen.current.has(tool.id)) continue;
      seen.current.add(tool.id);
      const created = createdGameId(tool);
      if (created) onNewGame(created);
      else if (tool.status === "done" && tool.call && tool.call.request.method.toUpperCase() !== "GET" && tool.call.request.url.includes(`/games/${gameId}`)) onSaved();
    }
  }, [messages, restoring, gameId, onNewGame, onSaved]);
  return null;
}

// While Frankie works, a bar over the preview says so, with the current step
// and a timer, so a long build never looks like a stuck page.
function BuildingBar() {
  const { messages, busy } = useFrankieChat();
  const [since, setSince] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    setSince(start);
    setNow(start);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);
  if (!busy) return null;
  const last = messages[messages.length - 1];
  const tools = last?.role === "assistant" ? last.tools : [];
  const running = [...tools].reverse().find((t) => t.status === "running");
  const step = running?.label ?? (last?.role === "assistant" && last.text ? "Writing the reply" : tools.length ? "Working out the next step" : "Thinking");
  const done = tools.filter((t) => t.status !== "running").length;
  const secs = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <div className="building" role="status" aria-live="polite">
      <span className="spinner" aria-hidden />
      <span className="what"><b>Frankie is building</b> · {step}…</span>
      {done > 0 && <span className="meta">{done} step{done === 1 ? "" : "s"} done</span>}
      <span className="meta">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
    </div>
  );
}

function FixWithFrankie({ error }: { error: string }) {
  const { send, busy } = useFrankieChat();
  return (
    <button className="btn small" disabled={busy} onClick={() => send(`The game preview shows this error: "${error}". Please read the game, fix it and save it.`)}>
      Ask Frankie to fix it
    </button>
  );
}
