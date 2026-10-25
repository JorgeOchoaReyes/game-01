"use client";

import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";

export function LogoutButton({ name }: { name: string }) {
  return (
    <button
      className="linklike"
      title={`Signed in as ${name}`}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        await signOut(firebaseAuth()).catch(() => {});
        window.location.href = "/";
      }}
    >
      Log out
    </button>
  );
}
