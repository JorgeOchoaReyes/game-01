import { getRequestUser } from "@/lib/server/auth";
import { readJson, route, unauthorized } from "@/lib/server/http";
import { listVoices, removeVoiceSettings, saveVoiceSettings, voiceSettings } from "@/lib/server/voice";

// The signed-in user's ElevenLabs connection. The key goes in, never comes out.

// GET -> { connected, keyHint, voiceId, voices }
export const GET = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const settings = await voiceSettings(user.id);
  const voices = settings.connected ? await listVoices(user.id).catch(() => []) : [];
  return Response.json({ ...settings, voices }, { headers: { "cache-control": "no-store" } });
});

// PUT { apiKey?, voiceId? } -> settings
export const PUT = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  return Response.json(await saveVoiceSettings(user.id, await readJson(req)));
});

export const DELETE = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  await removeVoiceSettings(user.id);
  return new Response(null, { status: 204 });
});
