"use client";

import { useEffect, useMemo, useRef } from "react";
import { preparePreview } from "@/lib/game-html";

type Props = {
  html: string;
  // bump to restart the game without changing its code
  runKey?: number;
  room?: string;
  inviteBase?: string;
  onError?: (message: string) => void;
};

// Runs a game in a sandboxed iframe: scripts allowed, but no access to the
// studio's origin, cookies or storage. Generated code stays in its box.
export function GameFrame({ html, runKey = 0, room, inviteBase, onError }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(
    () => preparePreview(html, { room, inviteBase, reportErrors: !!onError }),
    [html, room, inviteBase, onError],
  );

  useEffect(() => {
    if (!onError) return;
    const listen = (e: MessageEvent) => {
      if (e.source === ref.current?.contentWindow && e.data && typeof e.data.frankieError === "string") {
        onError(e.data.frankieError);
      }
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, [onError]);

  return (
    <iframe
      key={runKey}
      ref={ref}
      title="Game preview"
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-pointer-lock allow-modals"
      allow="autoplay; fullscreen; gamepad"
    />
  );
}
