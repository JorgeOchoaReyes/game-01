import type { Metadata } from "next";
import Link from "next/link";
import { Fredoka, Nunito } from "next/font/google";
import { currentUser } from "@/lib/server/session";
import { LogoutButton } from "@/components/LogoutButton";
import { PollyDog } from "@/components/PollyDog";
import { streakStatus } from "@/lib/server/streaks";
import "./globals.css";

const body = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], display: "swap", variable: "--font-body" });
const heading = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Polly Studio · make games and videos",
  description: "Describe a game or a short video and watch it come to life as Frankie builds it with you. Play, share, remix, download.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  const streak = user && !user.anonymous ? streakStatus(user) : null;
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`}>
      <body>
        <header className="topbar">
          <Link href="/" className="brand" aria-label="Polly Studio home">
            <PollyDog size={38} />
            <span>Polly <b>Studio</b></span>
          </Link>
          <nav className="topnav">
            <Link href="/">Home</Link>
            <Link href="/games">Discover</Link>
            <Link href="/studio" className="btn primary small">＋ Create</Link>
          </nav>
          <form className="search" action="/games" role="search">
            <input name="q" type="search" placeholder="Search games and videos" aria-label="Search games and videos" />
          </form>
          <div className="account">
            {user ? (
              <>
                {user.anonymous && <Link href="/signup" className="btn small save">Save your games</Link>}
                {streak && (
                  <span
                    className={`streak${streak.doneToday ? "" : " cold"}`}
                    title={
                      streak.doneToday
                        ? `${streak.count}-day streak. Best: ${streak.best}. Come back tomorrow!`
                        : streak.count
                          ? `${streak.count}-day streak. Play or build something today to keep it.`
                          : "Play or build something today to start a streak."
                    }
                  >
                    🔥 {streak.count}
                  </span>
                )}
                <span className="avatar" title={user.email ?? "Guest"}>{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="who">{user.name}</span>
                {!user.anonymous && <Link href="/settings" className="gear" title="Settings" aria-label="Settings">⚙</Link>}
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
