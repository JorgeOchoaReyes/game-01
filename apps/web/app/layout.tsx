import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frankie · make games by chatting",
  description: "Describe a game, play it right away, download it. Built on the practices behind Ember.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">🧟‍♂️ Frankie</Link>
          <div className="links">
            <Link href="/games">Games</Link>
            <Link href="/practices">How games are built</Link>
            <Link href="/create">Studio</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
