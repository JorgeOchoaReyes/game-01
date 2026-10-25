import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/lib/server/session";
import { safeNext } from "@/lib/next-param";

export const metadata = { title: "Sign up · Polly" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return <AuthForm mode="signup" next={next} />;
}
