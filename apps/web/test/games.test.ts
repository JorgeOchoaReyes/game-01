import { describe, expect, it } from "vitest";
import { createGame, getOwnedGame, getReadableGame, listPublicGames, listVersions, restoreVersion, updateGame } from "@/lib/server/games";
import { HttpError } from "@/lib/server/http";
import { account } from "./firebase-helpers";

const html = (title: string) => `<!DOCTYPE html><html><head><title>${title}</title></head><body><script>var x=1;</script></body></html>`;

async function status(p: Promise<unknown>): Promise<number> {
  try { await p; return 200; } catch (e) { if (e instanceof HttpError) return e.status; throw e; }
}

describe("games", () => {
  it("versions every html change, keeps history and restores forward", async () => {
    const me = await account();
    const g = await createGame(me, { html: html("Rocket Cat"), starterId: "star-catcher" });
    expect(g).toMatchObject({ title: "Rocket Cat", version: 1, visibility: "private" });

    const v2 = await updateGame(g.id, me, { html: html("Rocket Cat 2"), note: "faster" });
    expect(v2).toMatchObject({ version: 2, title: "Rocket Cat 2" });
    const renamed = await updateGame(g.id, me, { title: "Space Cat" });
    expect(renamed.version).toBe(2);

    expect(await status(updateGame(g.id, me, { html: html("stale"), baseVersion: 1 }))).toBe(409);
    expect(await status(updateGame(g.id, me, { html: "just words" }))).toBe(400);

    const restored = await restoreVersion(g.id, me, 1);
    expect(restored.version).toBe(3);
    expect(restored.html).toBe(html("Rocket Cat"));
    expect((await listVersions(g.id, me)).map((v) => v.version)).toEqual([3, 2, 1]);
  });

  it("keeps private games private and lets anyone play public ones", async () => {
    const owner = await account();
    const other = await account();
    const g = await createGame(owner, { html: html("Secret") });
    expect(await status(getOwnedGame(g.id, other))).toBe(404);
    expect(await status(getReadableGame(g.id, other))).toBe(404);
    expect(await status(getReadableGame(g.id, null))).toBe(404);
    expect(await status(updateGame(g.id, other, { title: "mine now" }))).toBe(404);

    await updateGame(g.id, owner, { visibility: "public" });
    expect((await getReadableGame(g.id, null)).title).toBe("Secret");
    expect((await listPublicGames()).some((p) => p.id === g.id)).toBe(true);
    expect(await status(updateGame(g.id, other, { title: "still no" }))).toBe(404);
    expect((await listPublicGames()).find((p) => p.id === g.id)?.ownerName).toBe("Player");
  });

  it("lets an admin open and change anyone's game, and nobody else", async () => {
    const owner = await account("Owner");
    const stranger = await account("Stranger");
    const admin = { ...(await account("Admin")), admin: true };
    const g = await createGame(owner, { html: html("Mine") });
    expect(await status(getOwnedGame(g.id, stranger))).toBe(404);
    expect(await status(getReadableGame(g.id, stranger))).toBe(404);
    expect((await getReadableGame(g.id, admin)).title).toBe("Mine");
    expect((await updateGame(g.id, admin, { title: "Fixed by admin" })).title).toBe("Fixed by admin");
  });
});
