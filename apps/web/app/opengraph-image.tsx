import { OG_SIZE, ogCard } from "@/lib/og";

// The social card every page shares unless it has its own.
export const alt = "Polly Studio: make games and videos with AI";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ label: "Polly Studio", title: "Make games and videos with AI.", line: "Describe it. Watch it get built. Play, share or export." });
}
