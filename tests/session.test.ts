import { describe, expect, it } from "vitest";
import { catalog } from "@/content";
import { defaultEngineConfig as config } from "@/core/engine/config";
import type { LearnerEvent } from "@/core/learner/events";
import { emptyState, foldEvents } from "@/core/learner/state";
import {
  answer,
  closeSummary,
  next,
  revealHint,
  startSession,
  toMemo,
  type SessionEnv,
  type SessionState,
} from "@/core/session/session";

function makeEnv(): SessionEnv & { advance: (ms: number) => void } {
  let t = Date.parse("2026-03-01T09:00:00Z");
  let n = 0;
  let seed = 42;
  return {
    catalog,
    config,
    now: () => t,
    random: () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646,
    newId: () => `id-${++n}`,
    advance: (ms) => {
      t += ms;
    },
  };
}

function answerCorrectly(state: SessionState, env: ReturnType<typeof makeEnv>) {
  const q = state.current!.selection.ref.question;
  env.advance(10_000);
  return answer(state, { kind: "choice", selected: q.answer }, env);
}

describe("세션 흐름", () => {
  it("목표 문제 수를 채우면 요약 → 이완 → 메모로 이어진다", () => {
    const env = makeEnv();
    const events: LearnerEvent[] = [];
    let s = startSession(emptyState(), { topicIds: [], goal: { kind: "questions", count: 3 } }, env);

    for (let i = 0; i < 3; i++) {
      expect(s.phase).toBe("question");
      const t = answerCorrectly(s, env);
      events.push(...t.events);
      expect(t.state.phase).toBe("feedback");
      expect(t.state.lastResult?.correct).toBe(true);
      s = next(t.state, env);
    }
    expect(s.phase).toBe("summary");
    expect(s.answered).toBe(3);

    const closed = closeSummary(s, env);
    events.push(...closed.events);
    expect(closed.state.phase).toBe("relax");
    expect(closed.events[0]).toMatchObject({ type: "session", answered: 3, correct: 3 });
    expect(toMemo(closed.state).phase).toBe("memo");

    // 세션 중 상태와 이벤트를 다시 접은 상태가 같아야 한다(기기 간 일관성)
    const refolded = foldEvents(events, config);
    expect(refolded.skills).toEqual(s.learner.skills);
    expect(refolded.totalCorrect).toBe(3);
  });

  it("힌트는 개수만큼만 열리고, 사용 기록이 남는다", () => {
    const env = makeEnv();
    let s = startSession(emptyState(), { topicIds: ["git"], goal: { kind: "questions", count: 1 } }, env);
    const hints = s.current!.selection.ref.question.hints.length;
    for (let i = 0; i < hints + 2; i++) s = revealHint(s);
    expect(s.current!.hintsShown).toBe(hints);
    const t = answerCorrectly(s, env);
    expect(t.events[0]).toMatchObject({ type: "attempt", hintsUsed: hints });
  });

  it("보기 순서를 섞어도 채점은 원래 정답 인덱스로 한다", () => {
    const env = makeEnv();
    const s = startSession(emptyState(), { topicIds: ["db"], goal: { kind: "questions", count: 1 } }, env);
    const p = s.current!.presentation;
    expect([...p.order].sort()).toEqual(s.current!.selection.ref.question.choices.map((_, i) => i));
  });

  it("시간 목표는 경과 시간으로 판단한다", () => {
    const env = makeEnv();
    let s = startSession(emptyState(), { topicIds: [], goal: { kind: "minutes", minutes: 1 } }, env);
    s = next(answerCorrectly(s, env).state, env);
    expect(s.phase).toBe("question");
    env.advance(60_000);
    s = next(answerCorrectly(s, env).state, env);
    expect(s.phase).toBe("summary");
  });

  it("토픽 문제를 다 풀면 요약으로 끝난다", () => {
    const env = makeEnv();
    const total = catalog.pool(["web"]).length;
    let s = startSession(emptyState(), { topicIds: ["web"], goal: { kind: "questions", count: 999 } }, env);
    for (let i = 0; i < total; i++) s = next(answerCorrectly(s, env).state, env);
    expect(s.phase).toBe("summary");
    expect(s.exhausted).toBe(true);
  });
});
