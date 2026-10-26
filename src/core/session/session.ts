import { grade, present, type QuestionPresentation, type QuestionResponse } from "../content/kinds";
import type { ContentCatalog } from "../content/registry";
import type { EngineConfig } from "../engine/config";
import { classifyPace, type Pace } from "../engine/pace";
import { selectNext, type Selection } from "../engine/selector";
import type { LevelChange } from "../engine/skill";
import type { AttemptEvent, LearnerEvent, SessionEvent, SessionGoal } from "../learner/events";
import { applyAttempt, type LearnerState } from "../learner/state";

/**
 * 세션 흐름(순수 상태 머신).
 *   question → feedback → question … → summary → relax → memo → done
 * 시간·난수·id 생성은 SessionEnv로 주입해서 테스트와 UI가 같은 로직을 쓴다.
 */
export type SessionPhase = "question" | "feedback" | "summary" | "relax" | "memo" | "done";

export interface SessionSettings {
  topicIds: string[];
  goal: SessionGoal;
}

export interface SessionEnv {
  catalog: ContentCatalog;
  config: EngineConfig;
  now: () => number;
  random: () => number;
  newId: () => string;
}

export interface CurrentQuestion {
  selection: Selection;
  presentation: QuestionPresentation;
  shownAt: number;
  hintsShown: number;
}

export interface AnswerResult {
  response: QuestionResponse;
  correct: boolean;
  pace: Pace;
  change: LevelChange;
}

export interface SessionState {
  id: string;
  settings: SessionSettings;
  startedAt: number;
  phase: SessionPhase;
  learner: LearnerState;
  asked: string[];
  /** 이번 세션에서 실제로 답한 토픽 */
  touchedTopics: string[];
  current: CurrentQuestion | null;
  lastResult: AnswerResult | null;
  answered: number;
  correct: number;
  /** 세션 시작 시점의 토픽별 레벨(요약에서 변화량 표시) */
  levelsAtStart: Record<string, number>;
  /** 문제 풀(소진되면 세션 종료) */
  exhausted: boolean;
}

export interface Transition {
  state: SessionState;
  events: LearnerEvent[];
}

export function startSession(learner: LearnerState, settings: SessionSettings, env: SessionEnv): SessionState {
  const levelsAtStart = Object.fromEntries(Object.values(learner.skills).map((s) => [s.topicId, s.level]));
  const base: SessionState = {
    id: env.newId(),
    settings,
    startedAt: env.now(),
    phase: "question",
    learner,
    asked: [],
    touchedTopics: [],
    current: null,
    lastResult: null,
    answered: 0,
    correct: 0,
    levelsAtStart,
    exhausted: false,
  };
  return advance(base, env);
}

function advance(state: SessionState, env: SessionEnv): SessionState {
  const selection = selectNext({
    pool: env.catalog.pool(state.settings.topicIds),
    skills: state.learner.skills,
    memory: state.learner.memory,
    askedInSession: new Set(state.asked),
    lastTopicId: state.current?.selection.ref.topicId,
    now: env.now(),
    config: env.config,
    random: env.random,
  });
  if (!selection) return { ...state, phase: "summary", current: null, exhausted: true };
  return {
    ...state,
    phase: "question",
    asked: [...state.asked, selection.ref.question.id],
    current: {
      selection,
      presentation: present(selection.ref.question, env.random),
      shownAt: env.now(),
      hintsShown: 0,
    },
    lastResult: null,
  };
}

export function revealHint(state: SessionState): SessionState {
  if (state.phase !== "question" || !state.current) return state;
  const max = state.current.selection.ref.question.hints.length;
  if (state.current.hintsShown >= max) return state;
  return { ...state, current: { ...state.current, hintsShown: state.current.hintsShown + 1 } };
}

export function answer(state: SessionState, response: QuestionResponse, env: SessionEnv): Transition {
  if (state.phase !== "question" || !state.current) return { state, events: [] };
  const { selection, shownAt, hintsShown } = state.current;
  const { question, topicId } = selection.ref;
  const now = env.now();
  const responseMs = Math.max(0, now - shownAt);
  const correct = grade(question, response);
  const pace = classifyPace(question, responseMs, env.config);

  const attempt: AttemptEvent = {
    type: "attempt",
    id: env.newId(),
    sessionId: state.id,
    questionId: question.id,
    topicId,
    difficulty: question.difficulty,
    correct,
    hintsUsed: hintsShown,
    responseMs,
    pace,
    at: new Date(now).toISOString(),
  };
  const applied = applyAttempt(state.learner, attempt, env.config);

  return {
    events: [attempt],
    state: {
      ...state,
      phase: "feedback",
      learner: applied.state,
      touchedTopics: state.touchedTopics.includes(topicId) ? state.touchedTopics : [...state.touchedTopics, topicId],
      answered: state.answered + 1,
      correct: state.correct + (correct ? 1 : 0),
      lastResult: { response, correct, pace, change: applied.change },
    },
  };
}

export function goalProgress(state: SessionState, now: number): number {
  const { goal } = state.settings;
  if (goal.kind === "questions") return Math.min(1, state.answered / goal.count);
  return Math.min(1, (now - state.startedAt) / (goal.minutes * 60_000));
}

export function isGoalReached(state: SessionState, now: number): boolean {
  return goalProgress(state, now) >= 1;
}

/** 피드백 다음: 목표를 채웠으면 요약으로, 아니면 다음 문제 */
export function next(state: SessionState, env: SessionEnv): SessionState {
  if (state.phase !== "feedback") return state;
  if (isGoalReached(state, env.now())) return { ...state, phase: "summary", current: null };
  return advance(state, env);
}

/** 사용자가 중간에 그만두기 */
export function finishEarly(state: SessionState): SessionState {
  if (state.phase !== "question" && state.phase !== "feedback") return state;
  return { ...state, phase: "summary", current: null };
}

/** 요약 화면을 떠날 때 세션 기록 이벤트를 만든다(푼 문제가 있을 때만). */
export function closeSummary(state: SessionState, env: SessionEnv): Transition {
  if (state.phase !== "summary") return { state, events: [] };
  const events: SessionEvent[] =
    state.answered > 0
      ? [
          {
            type: "session",
            id: state.id,
            topicIds: state.settings.topicIds,
            goal: state.settings.goal,
            answered: state.answered,
            correct: state.correct,
            startedAt: new Date(state.startedAt).toISOString(),
            endedAt: new Date(env.now()).toISOString(),
          },
        ]
      : [];
  return { state: { ...state, phase: "relax" }, events };
}

export function toMemo(state: SessionState): SessionState {
  return state.phase === "relax" ? { ...state, phase: "memo" } : state;
}

export function complete(state: SessionState): SessionState {
  return { ...state, phase: "done" };
}

export interface LevelDelta {
  topicId: string;
  before: number;
  after: number;
}

export function levelDeltas(state: SessionState, config: EngineConfig): LevelDelta[] {
  return state.touchedTopics.map((topicId) => ({
    topicId,
    before: state.levelsAtStart[topicId] ?? config.initialLevel,
    after: state.learner.skills[topicId]?.level ?? config.initialLevel,
  }));
}
