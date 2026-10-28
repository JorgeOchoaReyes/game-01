import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/lib/server/session";
import { safeNext } from "@/lib/next-param";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: "Log in", description: "Make an account to build games and videos with AI. Your first one is free.", path: "/login", noindex: true });

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await currentUser();
  // guests may still log in or sign up: their games come along
  if (user && !user.anonymous) redirect(next);
  return <AuthForm mode="login" next={next} guest={!!user} />;
}
