import { Suspense } from "react";
import { Studio } from "@/components/Studio";

export const metadata = { title: "Studio · Frankie" };

export default function Create() {
  return (
    <Suspense>
      <Studio />
    </Suspense>
  );
}
