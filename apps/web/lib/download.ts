import JSZip from "jszip";
import { RELAY_URL, gameTitle, slugify, usesNet, usesThree } from "./game-html";

// Packs a game exactly the way Ember ships: index.html at the top level and a
// vendor/ folder beside it. Unzip, serve the folder, play. No studio needed.
export async function downloadGame(html: string): Promise<void> {
  const title = gameTitle(html);
  const zip = new JSZip();

  let file = html;
  if (usesNet(html) && !/GAMEKIT_RELAY/.test(html)) {
    // the downloaded copy keeps talking to the same relay as the studio
    const tag = `<script>window.GAMEKIT_RELAY = window.GAMEKIT_RELAY || ${JSON.stringify(RELAY_URL)};</script>`;
    file = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + "\n" + tag) : tag + html;
  }
  zip.file("index.html", file);

  const vendor = ["game-kit.js", ...(usesThree(html) ? ["three.min.js"] : [])];
  for (const name of vendor) {
    const res = await fetch(`/runtime/vendor/${name}`);
    if (!res.ok) throw new Error(`Could not load vendor/${name}`);
    zip.file(`vendor/${name}`, await res.text());
  }

  zip.file(
    "README.txt",
    `${title}
Made with Frankie.

Play it:
  1. Unzip this folder.
  2. Serve it with any static web server, for example:
       npx serve .        or        python3 -m http.server 8000
  3. Open the address it prints. (Opening index.html directly from disk
     works for most games too, but some browsers block it.)

Files:
  index.html          the whole game, readable. Edit it and refresh.
  vendor/game-kit.js  the Frankie runtime (input, sound, effects, multiplayer)
${usesThree(html) ? "  vendor/three.min.js Three.js r128 (MIT)\n" : ""}${
      usesNet(html)
        ? "\nOnline multiplayer connects to the relay set in window.GAMEKIT_RELAY\n(top of index.html), or add ?relay=wss://your-relay to the address.\nRun your own: pnpm --filter @frankie/relay start\n"
        : ""
    }`,
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(title)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
