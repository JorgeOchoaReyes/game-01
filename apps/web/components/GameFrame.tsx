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
  // bump to ask the game to record itself (a film plays start to finish)
  record?: number;
  // the recorded video; without it the file is downloaded
  onVideo?: (video: Blob, name: string) => void;
  // a film's voiceover, handed to it whenever the frame (re)loads
  voice?: { scene: number; data: ArrayBuffer }[] | null;
};

// Saves a file the sandboxed game can't save itself (it has no download permission).
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Runs a game in a sandboxed iframe: scripts allowed, but no access to the
// studio's origin, cookies or storage. Generated code stays in its box.
export function GameFrame({ html, runKey = 0, room, inviteBase, onError, record = 0, onVideo, voice }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const sendVoice = () => {
    if (voice !== undefined) ref.current?.contentWindow?.postMessage({ pollyVoice: voice ?? [] }, "*");
  };
  // the preview's <base> is this page's origin, which only the browser knows
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const srcDoc = useMemo(
    () => (mounted ? preparePreview(html, { room, inviteBase, reportErrors: !!onError }) : ""),
    [mounted, html, room, inviteBase, onError],
  );

  // messages from the game: errors (for "ask Frankie to fix it") and finished videos
  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || !e.data) return;
      if (onError && typeof e.data.pollyGameError === "string") onError(e.data.pollyGameError);
      if (e.data.pollyVideo instanceof Blob) {
        const name = typeof e.data.name === "string" ? e.data.name : "video.webm";
        if (onVideo) onVideo(e.data.pollyVideo, name);
        else saveFile(e.data.pollyVideo, name);
      }
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, [onError, onVideo]);

  useEffect(() => {
    if (record) ref.current?.contentWindow?.postMessage({ pollyRecord: true }, "*");
  }, [record]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(sendVoice, [voice]);

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
      onLoad={sendVoice}
    />
  );
}
