import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/lib/server/session";
import { safeNext } from "@/lib/next-param";

export const metadata = { title: "Log in · Polly" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return <AuthForm mode="login" next={next} />;
}
