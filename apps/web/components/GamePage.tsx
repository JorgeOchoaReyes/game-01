"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GameArt, formatPlays } from "./GameTile";
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
  const stage = useRef<HTMLDivElement>(null);

  // a multiplayer invite link (?room=CODE) goes straight into the game
  useEffect(() => {
    if (new URL(window.location.href).searchParams.has("room")) setPlaying(true);
  }, []);

  const play = () => {
    setPlaying(true);
    if (countPlay) void fetch(`/api/games/${countPlay}/play`, { method: "POST" }).catch(() => {});
  };

  return (
    <main className="wrap game-page">
      <div className={`game-stage${playing ? " playing" : ""}`} ref={stage}>
        {playing ? (
          <>
            {html ? <PlayTemplate html={html} /> : <iframe title={title} src={src} allow="autoplay; fullscreen; gamepad" />}
            <div className="stage-controls">
              <button className="btn small" onClick={() => void stage.current?.requestFullscreen?.()}>⛶ Full screen</button>
              <button className="btn small" onClick={() => setPlaying(false)}>✕ Stop</button>
            </div>
          </>
        ) : (
          <button className="cover" onClick={play} aria-label={`Play ${title}`}>
            <GameArt seed={seed} emoji={emoji} big />
            <span className="play-badge">▶</span>
          </button>
        )}
      </div>

      <div className="game-info">
        <div className="game-title">
          <h1>{title}</h1>
          <p className="muted">by <b>{by}</b>{meta ? ` · ${meta}` : ""}</p>
          {notice}
        </div>
        <div className="game-actions">
          {!playing && <button className="btn play big" onClick={play}>▶ Play</button>}
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
