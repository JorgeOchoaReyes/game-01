import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/session";
import { VoiceSettings } from "@/components/VoiceSettings";
import { PlanCard } from "@/components/PlanButtons";
import { PollyDog } from "@/components/PollyDog";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: "Settings", description: "Polly Studio", path: "/settings", noindex: true });
export const dynamic = "force-dynamic";

export default async function Settings() {
  const user = await currentUser();
  if (!user || user.anonymous) redirect("/login?next=/settings");
  return (
    <main className="wrap settings">
      <div className="settings-title">
        <PollyDog size={56} mood="calm" />
        <div>
          <h1>Settings</h1>
          <p className="muted">{user.name}{user.email ? ` · ${user.email}` : ""}</p>
        </div>
      </div>
      <PlanCard />
      <VoiceSettings />
    </main>
  );
}
