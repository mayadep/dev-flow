/**
 * 학습 기록은 불변 이벤트 로그로 저장한다.
 * 기기 로컬과 서버(Neon)는 같은 이벤트를 주고받고, 실력 상태는 이벤트를 접어서(fold) 다시 계산한다.
 * 그래서 어느 기기에서든 같은 로그면 같은 상태가 나온다.
 */
import type { Difficulty } from "../content/types";
import type { Pace } from "../engine/pace";

export interface AttemptEvent {
  type: "attempt";
  id: string;
  sessionId: string;
  questionId: string;
  topicId: string;
  difficulty: Difficulty;
  correct: boolean;
  hintsUsed: number;
  responseMs: number;
  /** 답한 시점의 속도 판정. 콘텐츠가 바뀌어도 과거 기록 해석이 변하지 않도록 함께 저장 */
  pace: Pace;
  /** ISO 시각 */
  at: string;
}

export type SessionGoal =
  | { kind: "questions"; count: number }
  | { kind: "minutes"; minutes: number };

export interface SessionEvent {
  type: "session";
  id: string;
  topicIds: string[];
  goal: SessionGoal;
  answered: number;
  correct: number;
  startedAt: string;
  endedAt: string;
}

/** 메모는 수정/삭제가 가능하므로 updatedAt 기준 최신 버전이 이긴다(LWW). */
export interface MemoEvent {
  type: "memo";
  id: string;
  text: string;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export type LearnerEvent = AttemptEvent | SessionEvent | MemoEvent;

/** 같은 id의 이벤트 중 어느 쪽을 남길지. attempt/session은 불변이라 먼저 온 것을 유지한다. */
export function newerOf<E extends LearnerEvent>(a: E, b: E): E {
  if (a.type === "memo" && b.type === "memo") {
    return (b.updatedAt > a.updatedAt ? b : a) as E;
  }
  return a;
}

export function eventTime(e: LearnerEvent): string {
  switch (e.type) {
    case "attempt":
      return e.at;
    case "session":
      return e.endedAt;
    case "memo":
      return e.updatedAt;
  }
}
