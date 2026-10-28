import { describe, expect, it } from "vitest";
import { createGame, updateGame } from "@/lib/server/games";
import { activity, person } from "@/lib/server/admin";
import { HttpError } from "@/lib/server/http";
import { account } from "./firebase-helpers";

const html = (title: string) => `<!DOCTYPE html><html><head><title>${title}</title></head><body><script>var x=1;</script></body></html>`;

describe("the admin activity log", () => {
  it("records what someone does, and only admins can read it", async () => {
    const me = await account("Maker");
    const admin = { ...(await account("Admin")), admin: true };
    const g = await createGame(me, { html: html("Rocket"), starterId: "star-catcher" });
    await updateGame(g.id, me, { html: html("Rocket 2"), note: "faster" });
    await updateGame(g.id, { ...me, agent: true }, { visibility: "public" });

    const mine = await activity(admin, { uid: me.id });
    expect(mine.map((e) => e.type)).toEqual(["game.publish", "game.save", "game.create", "signup"]);
    expect(mine[0]).toMatchObject({ via: "frankie", who: "Maker", title: "Rocket 2" });
    expect(mine[1].detail).toBe("v2 · faster");

    const p = await person(admin, me.id);
    expect(p?.games.map((x) => x.id)).toEqual([g.id]);
    await expect(activity(me)).rejects.toBeInstanceOf(HttpError);
  });
});
