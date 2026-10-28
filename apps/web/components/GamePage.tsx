"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GameArt, formatPlays } from "./GameTile";
import { Icon } from "./Icon";
import { PlayTemplate } from "./PlayTemplate";

type Props = {
  seed: string;
  emoji: string;
  title: string;
  by: string;
  blurb?: string;
  plays?: number;
  meta?: string;
  // one of: a game file to run sandboxed, or a trusted static build's URL
  html?: string;
  src?: string;
  // counts a play on this game when Play is pressed
  countPlay?: string;
  actions?: ReactNode;
  notice?: ReactNode;
};

// A game's page: cover, title and a big Play button. Play swaps the cover for
// the running game, with full screen one click away.
export function GamePage({ seed, emoji, title, by, blurb, plays, meta, html, src, countPlay, actions, notice }: Props) {
  const [playing, setPlaying] = useState(false);
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);

  // a multiplayer invite link (?room=CODE) goes straight into the game
  useEffect(() => {
    if (new URL(window.location.href).searchParams.has("room")) setPlaying(true);
  }, []);

  const play = () => {
    setPlaying(true);
    if (!countPlay) return;
    // counts the play and today's streak; refresh so the 🔥 in the top bar updates
    void fetch(`/api/games/${countPlay}/play`, { method: "POST" })
      .then(async (res) => { if ((await res.json().catch(() => null))?.streak) router.refresh(); })
      .catch(() => {});
  };
  const stop = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setPlaying(false);
  };

  return (
    <main className="wrap game-page">
      <div className={`game-stage${playing ? " playing" : ""}`} ref={stage}>
        {playing ? (
          <>
            {html ? <PlayTemplate html={html} /> : <iframe title={title} src={src} allow="autoplay; fullscreen; gamepad" />}
            <div className="stage-controls">
              <button className="btn small" onClick={() => void stage.current?.requestFullscreen?.()} title="Full screen (Esc to leave)"><Icon name="expand" /> Full screen</button>
              <button className="btn small stop" onClick={stop} title="Stop playing and go back to the game page"><Icon name="stop" /> Stop game</button>
            </div>
          </>
        ) : (
          <button className="cover" onClick={play} aria-label={`Play ${title}`}>
            <GameArt seed={seed} emoji={emoji} big />
            <span className="play-badge"><Icon name="play" size={30} /></span>
          </button>
        )}
      </div>

      {playing && <p className="stage-hint muted small">Playing. Press <b>Stop playing</b> to end the game, or Esc to leave full screen.</p>}

      <div className="game-info">
        <div className="game-title">
          <h1>{title}</h1>
          <p className="muted">by <b>{by}</b>{meta ? ` · ${meta}` : ""}</p>
          {notice}
        </div>
        <div className="game-actions">
          {playing ? (
            <button className="btn stop big" onClick={stop}><Icon name="stop" /> Stop playing</button>
          ) : (
            <button className="btn play big" onClick={play}><Icon name="play" /> Play</button>
          )}
          {actions}
        </div>
      </div>

      <div className="game-stats">
        {plays !== undefined && <div><b>{formatPlays(plays)}</b><span>plays</span></div>}
        {blurb && <p>{blurb}</p>}
      </div>
    </main>
  );
}
