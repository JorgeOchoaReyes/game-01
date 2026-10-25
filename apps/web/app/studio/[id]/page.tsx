import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/server/session";
import { findGame } from "@/lib/server/games";
import { StudioWorkspace } from "@/components/StudioWorkspace";

export const metadata = { title: "Studio · Polly Studio" };
export const dynamic = "force-dynamic";

export default async function StudioGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/studio/${id}`)}`);
  const game = await findGame(id);
  if (!game || game.ownerId !== user.id) notFound();

  const publishableKey = process.env.NEXT_PUBLIC_FRANKIE_PUBLISHABLE_KEY;
  return (
    <StudioWorkspace
      initial={{ id: game.id, title: game.title, version: game.version, visibility: game.visibility, html: game.html }}
      frankie={publishableKey ? { publishableKey, baseUrl: process.env.NEXT_PUBLIC_FRANKIE_URL || undefined } : null}
    />
  );
}
