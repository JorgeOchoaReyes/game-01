"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// /admin: give someone Pro without a subscription, or take it back.
export function CompButton({ uid, comp }: { uid: string; comp: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    await fetch(`/api/admin/users/${uid}/comp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ on: !comp }) });
    setBusy(false);
    router.refresh();
  };
  return <button className="btn small" disabled={busy} onClick={() => void toggle()}>{comp ? "Remove free Pro" : "Give free Pro"}</button>;
}
