import { describe, expect, it } from "vitest";
import { advance, dayBefore, localDay, streakStatus, touchStreak } from "@/lib/server/streaks";
import { getUser } from "@/lib/server/accounts";
import { createGame } from "@/lib/server/games";
import { account } from "./firebase-helpers";

const html = `<!DOCTYPE html><html><head><title>S</title></head><body><script>var x=1;</script></body></html>`;

describe("streak days", () => {
  it("counts days in the player's own timezone", () => {
    const at = new Date("2026-10-25T03:30:00Z");
    expect(localDay("UTC", at)).toBe("2026-10-25");
    expect(localDay("America/Los_Angeles", at)).toBe("2026-10-24");
    expect(localDay("Not/AZone", at)).toBe("2026-10-25");
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
  });

  it("grows on consecutive days, restarts after a gap, keeps the best", () => {
    let s = advance(null, "2026-10-01");
    expect(s).toEqual({ count: 1, best: 1, day: "2026-10-01" });
    s = advance(s, "2026-10-01");
    expect(s.count).toBe(1);
    s = advance(advance(s, "2026-10-02"), "2026-10-03");
    expect(s).toEqual({ count: 3, best: 3, day: "2026-10-03" });
    s = advance(s, "2026-10-05");
    expect(s).toEqual({ count: 1, best: 3, day: "2026-10-05" });
  });

  it("shows 0 once a day was missed, and whether today is done", () => {
    const at = new Date("2026-10-25T12:00:00Z");
    expect(streakStatus({ tz: "UTC", streak: { count: 4, best: 6, day: "2026-10-25" } }, at)).toEqual({ count: 4, best: 6, doneToday: true });
    expect(streakStatus({ tz: "UTC", streak: { count: 4, best: 6, day: "2026-10-24" } }, at)).toEqual({ count: 4, best: 6, doneToday: false });
    expect(streakStatus({ tz: "UTC", streak: { count: 4, best: 6, day: "2026-10-22" } }, at)).toEqual({ count: 0, best: 6, doneToday: false });
    expect(streakStatus({ tz: null, streak: null }, at)).toEqual({ count: 0, best: 0, doneToday: false });
  });
});

describe("streaks in Firestore", () => {
  it("starts when someone builds, and only counts a day once", async () => {
    const me = await account();
    await createGame(me, { html });
    expect((await getUser(me.id))!.streak?.count).toBe(1);
    await touchStreak(me.id);
    expect((await getUser(me.id))!.streak?.count).toBe(1);
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    expect((await touchStreak(me.id, tomorrow))?.count).toBe(2);
  });
});
