"use client";

import { useSyncExternalStore } from "react";

/**
 * 현재 시각을 외부 저장소처럼 구독한다(렌더 중 Date.now() 호출을 피하기 위함).
 * 구독자가 있을 때만 1초마다 갱신하고, 서버 렌더링에선 0을 돌려준다.
 */
const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      // 다음 구독 때 멈춰 있던 옛 시각을 돌려주지 않도록 비운다
      now = 0;
    }
  };
}

function getSnapshot() {
  if (now === 0) now = Date.now();
  return now;
}

export function useClock(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
