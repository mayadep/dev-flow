import type { EngineConfig } from "../engine/config";
import { applyToMemory, type QuestionMemory } from "../engine/memory";
import { applyToSkill, initialSkill, type LevelChange, type TopicSkill } from "../engine/skill";
import type { AttemptEvent, LearnerEvent, MemoEvent, SessionEvent } from "./events";

/** 이벤트 로그에서 계산되는 학습자 상태(파생 데이터, 저장 원본 아님) */
export interface LearnerState {
  skills: Record<string, TopicSkill>;
  memory: Record<string, QuestionMemory>;
  /** 로컬 날짜(YYYY-MM-DD)별 푼 문제 수 */
  daily: Record<string, { answered: number; correct: number }>;
  totalAnswered: number;
  totalCorrect: number;
  sessions: SessionEvent[];
  memos: MemoEvent[];
}

export function emptyState(): LearnerState {
  return { skills: {}, memory: {}, daily: {}, totalAnswered: 0, totalCorrect: 0, sessions: [], memos: [] };
}

export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 시도 하나 반영. 상태를 직접 바꾸지 않고 새 상태와 레벨 변화를 돌려준다. */
export function applyAttempt(
  state: LearnerState,
  attempt: AttemptEvent,
  config: EngineConfig,
): { state: LearnerState; change: LevelChange } {
  const prevSkill = state.skills[attempt.topicId] ?? initialSkill(attempt.topicId, config);
  const { skill, change } = applyToSkill(
    prevSkill,
    { correct: attempt.correct, hintsUsed: attempt.hintsUsed, pace: attempt.pace },
    config,
  );
  const memory = applyToMemory(
    state.memory[attempt.questionId],
    attempt.questionId,
    attempt.correct,
    attempt.hintsUsed,
    attempt.at,
  );
  const key = localDateKey(attempt.at);
  const day = state.daily[key] ?? { answered: 0, correct: 0 };
  return {
    change,
    state: {
      ...state,
      skills: { ...state.skills, [attempt.topicId]: skill },
      memory: { ...state.memory, [attempt.questionId]: memory },
      daily: { ...state.daily, [key]: { answered: day.answered + 1, correct: day.correct + (attempt.correct ? 1 : 0) } },
      totalAnswered: state.totalAnswered + 1,
      totalCorrect: state.totalCorrect + (attempt.correct ? 1 : 0),
    },
  };
}

/** 이벤트 전체를 시간순으로 접어 상태를 만든다. 어느 기기든 같은 로그 → 같은 상태. */
export function foldEvents(events: readonly LearnerEvent[], config: EngineConfig): LearnerState {
  const attempts = events
    .filter((e): e is AttemptEvent => e.type === "attempt")
    .sort((a, b) => (a.at === b.at ? a.id.localeCompare(b.id) : a.at.localeCompare(b.at)));

  let state = emptyState();
  for (const a of attempts) state = applyAttempt(state, a, config).state;

  state.sessions = events
    .filter((e): e is SessionEvent => e.type === "session")
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  state.memos = events
    .filter((e): e is MemoEvent => e.type === "memo" && !e.deleted)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return state;
}

/** 오늘 포함 연속으로 공부한 날 수 */
export function streakDays(state: LearnerState, now: Date): number {
  let count = 0;
  const cursor = new Date(now);
  // 오늘 아직 안 했으면 어제부터 센다
  if (!state.daily[localDateKey(cursor.toISOString())]) cursor.setDate(cursor.getDate() - 1);
  while (state.daily[localDateKey(cursor.toISOString())]) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
