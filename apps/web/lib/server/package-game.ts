import JSZip from "jszip";
import { usesNet, usesThree, slugify } from "@/lib/game-html";
import type { Game } from "./schema";

// Packs a game exactly the way Ember ships: index.html at the top level and a
// vendor/ folder beside it. Unzip, serve the folder, play. No Polly needed.
export async function packageGame(game: Game, origin: string, relayUrl: string): Promise<{ filename: string; body: Uint8Array }> {
  const zip = new JSZip();
  let file = game.html;
  if (usesNet(file) && !/GAMEKIT_RELAY/.test(file)) {
    // the downloaded copy keeps talking to the same relay as the site
    const tag = `<script>window.GAMEKIT_RELAY = window.GAMEKIT_RELAY || ${JSON.stringify(relayUrl)};</script>`;
    file = /<head[^>]*>/i.test(file) ? file.replace(/<head[^>]*>/i, (m) => m + "\n" + tag) : tag + file;
  }
  zip.file("index.html", file);

  const three = usesThree(file);
  for (const name of ["game-kit.js", ...(three ? ["three.min.js"] : [])]) {
    const res = await fetch(`${origin}/runtime/vendor/${name}`);
    if (!res.ok) throw new Error(`Could not load vendor/${name} (${res.status})`);
    zip.file(`vendor/${name}`, await res.text());
  }

  zip.file(
    "README.txt",
    `${game.title}
Made with Polly.

Play it:
  1. Unzip this folder.
  2. Serve it with any static web server, for example:
       npx serve .        or        python3 -m http.server 8000
  3. Open the address it prints.

Files:
  index.html          the whole game, readable. Edit it and refresh.
  vendor/game-kit.js  the Polly runtime (input, sound, effects, multiplayer)
${three ? "  vendor/three.min.js Three.js r128 (MIT)\n" : ""}${
      usesNet(file)
        ? "\nOnline multiplayer connects to the relay set in window.GAMEKIT_RELAY\n(top of index.html), or add ?relay=wss://your-relay to the address.\n"
        : ""
    }`,
  );
  return { filename: `${slugify(game.title)}.zip`, body: await zip.generateAsync({ type: "uint8array" }) };
}
