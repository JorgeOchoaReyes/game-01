"use client";

import { useEffect, useState } from "react";
import { GameFrame } from "./GameFrame";

// Invite links for gallery games point back at this page with ?room=CODE, so a
// friend who opens the link lands in the same multiplayer room.
export function PlayTemplate({ html }: { html: string }) {
  const [ctx, setCtx] = useState<{ room?: string; inviteBase: string } | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    setCtx({ room: url.searchParams.get("room") || undefined, inviteBase: url.origin + url.pathname });
  }, []);
  if (!ctx) return null;
  return <GameFrame html={html} room={ctx.room} inviteBase={ctx.inviteBase} />;
}
