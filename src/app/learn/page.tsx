import { Suspense } from "react";
import { Loading } from "@/ui/components/primitives";
import { SessionScreen } from "@/ui/session/session-screen";

export default function LearnPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SessionScreen />
    </Suspense>
  );
}
