import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/server/session";
import { activity, person } from "@/lib/server/admin";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CompButton } from "@/components/CompButton";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: "Admin", description: "Polly Studio admin", path: "/admin", noindex: true });
export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Admins only: one person's account, plan, games and everything they did.
export default async function AdminPerson({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const me = await currentUser().catch(() => null);
  if (!me?.admin) notFound();
  const [p, feed] = await Promise.all([person(me, uid), activity(me, { uid, limit: 200 })]);
  if (!p) notFound();
  const plan = p.pro ? (p.comp ? "Pro (free)" : `Pro · ${p.billing?.status}`) : "Free";
  return (
    <main className="wrap admin">
      <nav className="crumbs"><Link href="/admin">Admin</Link> <span>/</span> {p.user.name}</nav>
      <div className="settings-head">
        <div>
          <h1>{p.user.name}</h1>
          <p className="muted">{p.user.email ?? "guest"} · joined {day(p.user.createdAt)} · {plan}{p.billing?.currentPeriodEnd ? ` · renews ${day(p.billing.currentPeriodEnd)}` : ""}</p>
        </div>
        <CompButton uid={uid} comp={p.comp} />
      </div>

      <div className="admin-grid">
        <section>
          <h2>Activity</h2>
          <ActivityFeed items={feed} />
        </section>
        <section>
          <h2>Games ({p.games.length})</h2>
          <table>
            <thead><tr><th>Game</th><th>Version</th><th>Visibility</th><th>Plays</th><th>Updated</th></tr></thead>
            <tbody>
              {p.games.map((g) => (
                <tr key={g.id}>
                  <td><Link href={`/studio/${g.id}`}>{g.title}</Link></td>
                  <td>v{g.version}</td>
                  <td>{g.visibility === "public" ? <Link href={`/g/${g.id}`}>public</Link> : "private"}</td>
                  <td>{g.plays}</td>
                  <td>{day(g.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
