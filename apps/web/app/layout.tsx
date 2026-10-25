import type { Metadata } from "next";
import Link from "next/link";
import { Nunito } from "next/font/google";
import { currentUser } from "@/lib/server/session";
import { LogoutButton } from "@/components/LogoutButton";
import "./globals.css";

const font = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], display: "swap" });

export const metadata: Metadata = {
  title: "Polly · make games, play games",
  description: "Describe a game and play it while Frankie builds it. Share it, remix others, download it.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  return (
    <html lang="en" className={font.className}>
      <body>
        <header className="topbar">
          <Link href="/" className="brand">🦜 <span>Polly</span></Link>
          <nav className="topnav">
            <Link href="/">Home</Link>
            <Link href="/games">Discover</Link>
            <Link href="/studio" className="btn primary small">＋ Create</Link>
          </nav>
          <form className="search" action="/games" role="search">
            <input name="q" type="search" placeholder="Search games" aria-label="Search games" />
          </form>
          <div className="account">
            {user ? (
              <>
                {user.anonymous && <Link href="/signup" className="btn small save">Save your games</Link>}
                <span className="avatar" title={user.email ?? "Guest"}>{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="who">{user.name}</span>
                <LogoutButton name={user.name} />
              </>
            ) : (
              <>
                <Link href="/login" className="btn small">Log in</Link>
                <Link href="/signup" className="btn small primary">Sign up</Link>
              </>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
