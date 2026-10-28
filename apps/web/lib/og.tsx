import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// The 1200x630 social card: Polly on the right, a label, a big title and a line.
export const OG_SIZE = { width: 1200, height: 630 };

export async function ogCard({ label, title, line }: { label: string; title: string; line: string }) {
  const svg = await readFile(path.join(process.cwd(), "app", "icon.svg"), "utf8");
  const polly = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const size = title.length > 34 ? 60 : 76;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, padding: "0 88px", background: "radial-gradient(circle at 78% 40%, #3a2f0e 0%, #0b0b0d 55%)", color: "#f4f4f5", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 22 }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>{label.toUpperCase()}</div>
          <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>{title.slice(0, 70)}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", lineHeight: 1.35 }}>{line}</div>
        </div>
        <div style={{ display: "flex", width: 340, height: 340, borderRadius: 999, border: "2px solid rgba(212,175,55,.35)", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={polly} width={260} height={260} alt="" />
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
