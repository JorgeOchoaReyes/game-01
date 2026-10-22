"use client";

export function LogoutButton({ name }: { name: string }) {
  return (
    <button
      className="linklike"
      title={`Signed in as ${name}`}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      Log out
    </button>
  );
}
