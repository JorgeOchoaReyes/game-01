"use client";

import { useState } from "react";

const REASONS: [string, string][] = [["sexual", "Sexual content or nudity"], ["hateful", "Hateful or slurs"], ["vulgar", "Vulgar language"], ["broken", "Broken or spam"], ["other", "Something else"]];

// Under a public game: tell the admins something is wrong with it.
export function ReportButton({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  if (sent) return <p className="muted small">Thanks, we&apos;ll take a look.</p>;
  if (!open) return <button className="linklike small" onClick={() => setOpen(true)}>Report this game</button>;
  return (
    <div className="report">
      <span className="muted small">What&apos;s wrong?</span>
      {REASONS.map(([id, label]) => (
        <button key={id} className="chip" onClick={() => void fetch(`/api/games/${gameId}/report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: id }) }).then(() => setSent(true))}>{label}</button>
      ))}
    </div>
  );
}
