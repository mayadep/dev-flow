"use client";

import { useEffect, useSyncExternalStore } from "react";
import { LearnerStore, type LearnerSnapshot } from "@/storage/learner-store";
import { getLearnerStore } from "./runtime";

const subscribe = (cb: () => void) => getLearnerStore().subscribe(cb);
const getSnapshot = () => getLearnerStore().getSnapshot();
const getServerSnapshot = () => LearnerStore.serverSnapshot;

/** 학습자 상태 구독. 서버 렌더링 중에는 ready=false 스냅샷을 돌려준다. */
export function useLearner(): LearnerSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 앱이 열릴 때·온라인 복귀·화면 복귀 시 동기화 */
export function useBackgroundSync(): void {
  useEffect(() => {
    const store = getLearnerStore();
    const run = () => void store.syncNow();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
