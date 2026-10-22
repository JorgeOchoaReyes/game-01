import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/server/session";
import { LogoutButton } from "@/components/LogoutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polly · make games, play games",
  description: "A tiny game engine, a home for your games, and Frankie to build them with you.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">🦜 Polly</Link>
          <div className="links">
            <Link href="/games">Games</Link>
            <Link href="/practices">How games are built</Link>
            {user ? (
              <>
                <Link href="/studio">Studio</Link>
                <LogoutButton name={user.name} />
              </>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/signup" className="btn primary small">Sign up</Link>
              </>
            )}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
