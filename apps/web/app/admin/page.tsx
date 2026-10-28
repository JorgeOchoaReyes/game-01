import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/server/session";
import { activity, recentGames, recentUsers, stats } from "@/lib/server/admin";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CompButton } from "@/components/CompButton";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: "Admin", description: "Polly Studio admin", path: "/admin", noindex: true });
export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Admins only (Firebase custom claim admin: true): the numbers, what people are
// doing right now, and recent games and people. Any game opens in the studio,
// where an admin can edit it like its owner.
export default async function Admin() {
  const user = await currentUser().catch(() => null);
  if (!user?.admin) notFound();
  const [s, feed, users, games] = await Promise.all([stats(user), activity(user, { limit: 80 }), recentUsers(user), recentGames(user)]);
  return (
    <main className="wrap admin">
      <h1>Admin</h1>
      <div className="stats">
        <div><b>{s.users}</b><span>people</span></div>
        <div><b>{s.games}</b><span>games and videos</span></div>
        <div><b>{s.pro}</b><span>paying Pro</span></div>
        <div><b>{s.last24h.signups}</b><span>sign-ups · 24h</span></div>
        <div><b>{s.last24h.created}</b><span>created · 24h</span></div>
        <div><b>{s.last24h.saves}</b><span>saves · 24h</span></div>
        <div><b>{s.last24h.plays}</b><span>plays · 24h</span></div>
      </div>

      <div className="admin-grid">
        <section>
          <h2>Activity</h2>
          <ActivityFeed items={feed} />
        </section>
        <section>
          <h2>Recent people</h2>
          <table>
            <thead><tr><th>Name</th><th>Joined</th><th>Plan</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><Link href={`/admin/users/${u.id}`}>{u.name}</Link><div className="muted small">{u.email ?? "guest"}</div></td>
                  <td>{day(u.createdAt)}</td>
                  <td>{u.pro ? (u.comp ? "Pro (free)" : `Pro · ${u.status}`) : "Free"}</td>
                  <td><CompButton uid={u.id} comp={u.comp} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <h2>Recent games</h2>
      <table>
        <thead><tr><th>Game</th><th>Owner</th><th>Version</th><th>Visibility</th><th>Plays</th><th>Updated</th></tr></thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.id}>
              <td><Link href={`/studio/${g.id}`}>{g.title}</Link></td>
              <td><Link href={`/admin/users/${g.ownerId}`}>{g.ownerName}</Link></td>
              <td>v{g.version}</td>
              <td>{g.visibility === "public" ? <Link href={`/g/${g.id}`}>public</Link> : "private"}</td>
              <td>{g.plays}</td>
              <td>{day(g.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
