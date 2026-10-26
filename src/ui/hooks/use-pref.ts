"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getPrefs } from "../learner/runtime";

/** 기기 전용 화면 설정(마지막 선택 등)을 구독형으로 읽고 쓴다. */
const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read<T>(key: string, fallback: T): T {
  if (!cache.has(key)) cache.set(key, getPrefs().get<T>(key) ?? fallback);
  return cache.get(key) as T;
}

export function usePref<T>(key: string, fallback: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: T) => {
      cache.set(key, next);
      getPrefs().set(key, next);
      for (const l of listeners) l();
    },
    [key],
  );
  return [value, set];
}
