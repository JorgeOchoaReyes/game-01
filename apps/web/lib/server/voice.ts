import { createHash } from "node:crypto";
import { HttpError, badRequest } from "./http";
import { usersCol } from "./schema";
import { firestore } from "./firebase";

// ElevenLabs voiceovers, per user: each person brings their own API key. The
// key lives server side in users/{uid}/private/elevenlabs (Firestore rules deny
// browsers everything) and is never sent back; the page only sees its last 4.

const API = "https://api.elevenlabs.io/v1";
const MODEL = "eleven_multilingual_v2";
// "Rachel", one of ElevenLabs' premade voices, until the person picks their own
export const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";
const MAX_CHARS_PER_SCENE = 400;

type Stored = { apiKey: string; voiceId: string; updatedAt: Date };

const keyDoc = (uid: string) => usersCol().doc(uid).collection("private").doc("elevenlabs");

async function stored(uid: string): Promise<Stored | null> {
  const snap = await keyDoc(uid).get();
  return snap.exists ? (snap.data() as Stored) : null;
}

export async function voiceSettings(uid: string) {
  const s = await stored(uid);
  return s ? { connected: true, keyHint: `…${s.apiKey.slice(-4)}`, voiceId: s.voiceId } : { connected: false, keyHint: null, voiceId: null };
}

async function eleven(apiKey: string, path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { "xi-api-key": apiKey, ...(init.headers ?? {}) } });
  } catch {
    throw new HttpError(502, "elevenlabs_unreachable", "Couldn't reach ElevenLabs. Try again in a moment.");
  }
  if (res.status === 401) throw new HttpError(400, "elevenlabs_key_rejected", "ElevenLabs didn't accept that API key. Check it in your ElevenLabs profile.");
  if (res.status === 429) throw new HttpError(429, "elevenlabs_rate_limited", "ElevenLabs is rate limiting this key. Wait a moment and try again.");
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const msg = detail?.detail?.message || detail?.detail?.status || `ElevenLabs answered ${res.status}.`;
    throw new HttpError(502, "elevenlabs_error", `ElevenLabs: ${String(msg).slice(0, 200)}`);
  }
  return res;
}

// Saves a new key (checked against ElevenLabs first) and/or a voice choice.
export async function saveVoiceSettings(uid: string, input: { apiKey?: unknown; voiceId?: unknown }) {
  const current = await stored(uid);
  let apiKey = current?.apiKey;
  if (input.apiKey !== undefined) {
    if (typeof input.apiKey !== "string" || input.apiKey.trim().length < 20 || input.apiKey.length > 200) throw badRequest("Paste your ElevenLabs API key (from your ElevenLabs profile, API keys).");
    apiKey = input.apiKey.trim();
    await eleven(apiKey, "/voices");
  }
  if (!apiKey) throw badRequest("Add your ElevenLabs API key first.");
  const voiceId = typeof input.voiceId === "string" && /^[A-Za-z0-9]{8,40}$/.test(input.voiceId) ? input.voiceId : current?.voiceId ?? DEFAULT_VOICE;
  await keyDoc(uid).set({ apiKey, voiceId, updatedAt: new Date() });
  return voiceSettings(uid);
}

export async function removeVoiceSettings(uid: string) {
  await keyDoc(uid).delete();
}

export async function listVoices(uid: string): Promise<{ id: string; name: string; description: string | null }[]> {
  const s = await stored(uid);
  if (!s) return [];
  const body = await (await eleven(s.apiKey, "/voices")).json();
  return (body.voices ?? []).map((v: { voice_id: string; name: string; labels?: Record<string, string> }) => ({
    id: v.voice_id,
    name: v.name,
    description: v.labels ? Object.values(v.labels).filter(Boolean).slice(0, 3).join(", ") || null : null,
  }));
}

// A film's spoken lines: each scene's caption, in order, without *highlight* marks.
export function filmLines(html: string): string[] {
  const lines: string[] = [];
  const re = /\bcaption\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    lines.push(m[2].replace(/\\(['"\\])/g, "$1").replace(/\*/g, "").trim());
  }
  return lines;
}

// One mp3 per scene, cached by voice + text so an unchanged scene is never paid for twice.
export async function narrate(uid: string, gameId: string, html: string) {
  const s = await stored(uid);
  if (!s) throw new HttpError(400, "elevenlabs_not_connected", "Connect ElevenLabs in Settings to add a voiceover.");
  const lines = filmLines(html);
  if (!lines.length) throw badRequest("This video has no captions to read. Each scene needs a caption.");
  const cache = firestore().collection("games").doc(gameId).collection("voice");
  const clips: { scene: number; text: string; audio: string; mime: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].slice(0, MAX_CHARS_PER_SCENE);
    if (!text) continue;
    const id = createHash("sha1").update(`${s.voiceId}\n${MODEL}\n${text}`).digest("hex");
    const hit = await cache.doc(id).get();
    if (hit.exists) {
      clips.push({ scene: i, text, audio: hit.get("audio"), mime: hit.get("mime") });
      continue;
    }
    const res = await eleven(s.apiKey, `/text-to-speech/${s.voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 } }),
    });
    const audio = Buffer.from(await res.arrayBuffer()).toString("base64");
    await cache.doc(id).set({ audio, mime: "audio/mpeg", text, voiceId: s.voiceId, createdAt: new Date() });
    clips.push({ scene: i, text, audio, mime: "audio/mpeg" });
  }
  return clips;
}

