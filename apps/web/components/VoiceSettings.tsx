"use client";

import { useEffect, useState } from "react";

type Voice = { id: string; name: string; description: string | null };
type Settings = { connected: boolean; keyHint: string | null; voiceId: string | null; voices?: Voice[] };

// Connect ElevenLabs with your own API key, and pick the voice your videos use.
export function VoiceSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/me/voice");
    if (res.ok) setS(await res.json());
  }
  useEffect(() => { void load(); }, []);

  async function save(body: object, done: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me/voice", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => null);
    if (res.ok) { setKey(""); setMsg({ ok: true, text: done }); await load(); }
    else setMsg({ ok: false, text: out?.error?.message || "That didn't work." });
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/me/voice", { method: "DELETE" });
    setMsg({ ok: true, text: "ElevenLabs disconnected. Your key was deleted." });
    await load();
    setBusy(false);
  }

  if (!s) return <p className="muted">Loading…</p>;
  return (
    <section className="card settings-card">
      <div className="settings-head">
        <div>
          <h2>🎙 Voiceovers with ElevenLabs</h2>
          <p className="muted">Add your own ElevenLabs API key and your videos get a narrator: each scene&apos;s caption, read aloud, recorded into the video.</p>
        </div>
        <span className={`pill${s.connected ? " on" : ""}`}>{s.connected ? `Connected ${s.keyHint}` : "Not connected"}</span>
      </div>

      <form className="settings-row" onSubmit={(e) => { e.preventDefault(); if (key.trim()) void save({ apiKey: key }, "Key saved. You're connected."); }}>
        <label>
          {s.connected ? "Replace API key" : "ElevenLabs API key"}
          <input type="password" autoComplete="off" spellCheck={false} placeholder="sk_…" value={key} onChange={(e) => setKey(e.target.value)} disabled={busy} />
        </label>
        <button className="btn primary" type="submit" disabled={busy || !key.trim()}>{busy ? "Checking…" : "Save key"}</button>
      </form>
      <p className="muted small">
        Find it at elevenlabs.io → your profile → API keys. It&apos;s stored on Polly Studio&apos;s server only, never shown again, and used only when you ask for a voiceover. Usage counts against your ElevenLabs plan.
      </p>

      {s.connected && (
        <>
          <label className="settings-row">
            Voice
            <select value={s.voiceId ?? ""} onChange={(e) => void save({ voiceId: e.target.value }, "Voice saved.")} disabled={busy}>
              {(s.voices ?? []).length === 0 && <option value={s.voiceId ?? ""}>Default voice</option>}
              {(s.voices ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}{v.description ? ` · ${v.description}` : ""}</option>)}
            </select>
          </label>
          <button className="linklike small" type="button" onClick={() => void remove()} disabled={busy}>Disconnect and delete my key</button>
        </>
      )}
      {msg && <p className={msg.ok ? "saved" : "form-error"} role="status">{msg.text}</p>}
    </section>
  );
}
