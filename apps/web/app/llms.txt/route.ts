import { FREE_GAMES } from "@/lib/server/billing";
import { GUIDES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// A plain summary for AI answer engines (llmstxt.org).
export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a browser-based AI game maker and AI video maker. You describe a game or a short video in a sentence; its AI collaborator, Frankie, writes the code while a live preview updates beside the chat. Games run in any modern browser with no install. Every game and video is one readable HTML file the owner can download.

- Games: desktop (keyboard and mouse) or mobile (portrait, touch), 2D or 3D (Three.js), optional online multiplayer.
- Videos: animated explainer shorts in 9:16, 16:9 or 1:1, with captions, sound, optional ElevenLabs voiceover, exported as MP4.
- Pricing: ${FREE_GAMES} game or video free; Polly Studio Pro is $10/month for unlimited.

## Guides
${GUIDES.map((g) => `- [${g.title}](${SITE_URL}/${g.slug}): ${g.blurb}`).join("\n")}

## Pages
- [Home](${SITE_URL}/): start a game or video
- [Discover](${SITE_URL}/games): public games people made
- [Pricing](${SITE_URL}/pricing)
- [How games are built](${SITE_URL}/practices): the rules and game-kit API every game follows
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
