import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/server/session";
import { recentGames, recentUsers } from "@/lib/server/admin";
import { CompButton } from "@/components/CompButton";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: "Admin", description: "Polly Studio admin", path: "/admin", noindex: true });
export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Admins only (Firebase custom claim admin: true): recent people and games.
// Any game opens in the studio, where an admin can edit it like its owner.
export default async function Admin() {
  const user = await currentUser().catch(() => null);
  if (!user?.admin) notFound();
  const [users, games] = await Promise.all([recentUsers(user), recentGames(user)]);
  return (
    <main className="wrap admin">
      <h1>Admin</h1>
      <h2>Recent games</h2>
      <table>
        <thead><tr><th>Game</th><th>Owner</th><th>Version</th><th>Visibility</th><th>Plays</th><th>Updated</th></tr></thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.id}>
              <td><Link href={`/studio/${g.id}`}>{g.title}</Link></td>
              <td>{g.ownerName}</td>
              <td>v{g.version}</td>
              <td>{g.visibility === "public" ? <Link href={`/g/${g.id}`}>public</Link> : "private"}</td>
              <td>{g.plays}</td>
              <td>{day(g.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Recent people</h2>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Plan</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email ?? "guest"}</td>
              <td>{day(u.createdAt)}</td>
              <td>{u.pro ? (u.comp ? "Pro (free)" : `Pro · ${u.status}`) : "Free"}</td>
              <td><CompButton uid={u.id} comp={u.comp} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
