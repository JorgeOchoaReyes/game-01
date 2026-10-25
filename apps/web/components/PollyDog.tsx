// Polly, the studio's chihuahua: black coat, gold points, white blaze. The
// logo, the favicon (app/icon.svg is the same drawing) and the friendly face
// on empty pages. Plain SVG, no assets.
export function PollyDog({ size = 40, mood = "happy", className }: { size?: number; mood?: "happy" | "wink" | "calm"; className?: string }) {
  const eye = mood === "calm" ? 4.4 : 5.4;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Polly the chihuahua">
      {/* big upright ears */}
      <path d="M16 31 L4 3 L29 19 Z" fill="#141414" stroke="#d4af37" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M48 31 L60 3 L35 19 Z" fill="#141414" stroke="#d4af37" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M15 26 L8 9 L24 20 Z" fill="#d4af37" />
      <path d="M49 26 L56 9 L40 20 Z" fill="#d4af37" />
      {/* apple head */}
      <ellipse cx="32" cy="36" rx="20.5" ry="18.5" fill="#141414" />
      {/* gold brows and cheeks: the tricolor markings */}
      <ellipse cx="23" cy="26.5" rx="3.2" ry="2.2" fill="#d4af37" />
      <ellipse cx="41" cy="26.5" rx="3.2" ry="2.2" fill="#d4af37" />
      <ellipse cx="32" cy="46" rx="12" ry="7.5" fill="#c9971c" />
      {/* white blaze down to the muzzle */}
      <path d="M32 19 C29.5 26 29.5 34 30 40 L34 40 C34.5 34 34.5 26 32 19 Z" fill="#ffffff" />
      <ellipse cx="32" cy="47.5" rx="8.5" ry="6.5" fill="#ffffff" />
      {/* big glossy eyes */}
      {mood === "wink" ? (
        <path d="M18.5 35 Q23.5 31.5 28.5 35" stroke="#ffffff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="23.5" cy="34.5" r={eye + 0.7} fill="#6b5212" />
          <circle cx="23.5" cy="34.5" r={eye} fill="#0a0a0a" />
          <circle cx="25.2" cy="32.6" r="1.8" fill="#fff" />
        </>
      )}
      <circle cx="40.5" cy="34.5" r={eye + 0.7} fill="#6b5212" />
      <circle cx="40.5" cy="34.5" r={eye} fill="#0a0a0a" />
      <circle cx="42.2" cy="32.6" r="1.8" fill="#fff" />
      {/* nose and mouth */}
      <path d="M29.2 43 Q32 41.4 34.8 43 Q34 45.8 32 46.2 Q30 45.8 29.2 43 Z" fill="#0a0a0a" />
      <circle cx="31" cy="42.9" r=".7" fill="#fff" opacity=".7" />
      <path d="M32 46.2 L32 48.2 M32 48.2 Q29.4 50.8 27.2 49 M32 48.2 Q34.6 50.8 36.8 49" stroke="#0a0a0a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {mood === "happy" && <path d="M30.2 49.8 Q32 54.2 33.8 49.8 Z" fill="#ff6f8a" />}
    </svg>
  );
}

// A paw print, for small decorations and list bullets.
export function Paw({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <ellipse cx="12" cy="16" rx="5.2" ry="4.4" fill="currentColor" />
      <ellipse cx="5.2" cy="10.4" rx="2.2" ry="2.8" fill="currentColor" />
      <ellipse cx="9.6" cy="6.2" rx="2.2" ry="2.9" fill="currentColor" />
      <ellipse cx="14.4" cy="6.2" rx="2.2" ry="2.9" fill="currentColor" />
      <ellipse cx="18.8" cy="10.4" rx="2.2" ry="2.8" fill="currentColor" />
    </svg>
  );
}
