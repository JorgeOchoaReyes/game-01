"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  // the preview's <base> is this page's origin, which only the browser knows
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const srcDoc = useMemo(
    () => (mounted ? preparePreview(html, { room, inviteBase, reportErrors: !!onError }) : ""),
    [mounted, html, room, inviteBase, onError],
  );

  useEffect(() => {
    if (!onError) return;
    const listen = (e: MessageEvent) => {
      if (e.source === ref.current?.contentWindow && e.data && typeof e.data.pollyGameError === "string") {
        onError(e.data.pollyGameError);
      }
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, [onError]);

  // render the frame only with its real content: changing srcdoc while the
  // first (empty) document is still loading doesn't reliably reload it
  if (!mounted) return null;

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
