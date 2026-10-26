"use client";

import { useCallback, useMemo, useState } from "react";
import { catalog } from "@/content";
import type { QuestionResponse } from "@/core/content/kinds";
import {
  answer as answerQ,
  closeSummary,
  complete,
  finishEarly,
  next as nextQ,
  revealHint,
  startSession,
  toMemo,
  type SessionEnv,
  type SessionSettings,
  type SessionState,
} from "@/core/session/session";
import { clock, engineConfig, getLearnerStore } from "../learner/runtime";

/**
 * 세션 상태 머신을 React에 연결한다. 생성되는 이벤트는 즉시 학습자 저장소에 기록된다.
 */
export function useSession(settings: SessionSettings) {
  const env = useMemo<SessionEnv>(
    () => ({ catalog, config: engineConfig, now: clock.now, random: clock.random, newId: clock.newId }),
    [],
  );
  const [state, setState] = useState<SessionState>(() =>
    startSession(getLearnerStore().getSnapshot().state, settings, env),
  );

  const store = getLearnerStore();

  return {
    state,
    env,
    hint: useCallback(() => setState((s) => revealHint(s)), []),
    answer: useCallback(
      (response: QuestionResponse) => {
        const t = answerQ(state, response, env);
        store.record(t.events);
        setState(t.state);
      },
      [state, env, store],
    ),
    next: useCallback(() => setState((s) => nextQ(s, env)), [env]),
    quit: useCallback(() => setState((s) => finishEarly(s)), []),
    toRelax: useCallback(() => {
      const t = closeSummary(state, env);
      store.record(t.events);
      setState(t.state);
    }, [state, env, store]),
    toMemo: useCallback(() => setState((s) => toMemo(s)), []),
    complete: useCallback(() => setState((s) => complete(s)), []),
  };
}
