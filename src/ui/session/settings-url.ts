import type { SessionGoal } from "@/core/learner/events";
import type { SessionSettings } from "@/core/session/session";

/** 세션 설정 ↔ URL 쿼리. 주소를 북마크해 두면 같은 설정으로 바로 시작할 수 있다. */

export const GOAL_PRESETS: { id: string; label: string; goal: SessionGoal }[] = [
  { id: "q5", label: "5문제", goal: { kind: "questions", count: 5 } },
  { id: "q10", label: "10문제", goal: { kind: "questions", count: 10 } },
  { id: "q15", label: "15문제", goal: { kind: "questions", count: 15 } },
  { id: "m5", label: "5분", goal: { kind: "minutes", minutes: 5 } },
  { id: "m10", label: "10분", goal: { kind: "minutes", minutes: 10 } },
];

export const DEFAULT_GOAL_ID = "q10";

export function goalId(goal: SessionGoal): string {
  return goal.kind === "questions" ? `q${goal.count}` : `m${goal.minutes}`;
}

export function parseGoal(id: string | null): SessionGoal {
  const m = /^([qm])(\d{1,3})$/.exec(id ?? "");
  if (!m) return GOAL_PRESETS.find((p) => p.id === DEFAULT_GOAL_ID)!.goal;
  const n = Math.min(200, Math.max(1, Number(m[2])));
  return m[1] === "q" ? { kind: "questions", count: n } : { kind: "minutes", minutes: n };
}

export function goalLabel(goal: SessionGoal): string {
  return goal.kind === "questions" ? `${goal.count}문제` : `${goal.minutes}분`;
}

export function toSearch(settings: SessionSettings): string {
  const p = new URLSearchParams();
  if (settings.topicIds.length) p.set("topics", settings.topicIds.join(","));
  p.set("goal", goalId(settings.goal));
  return p.toString();
}

export function fromSearch(params: URLSearchParams, knownTopics: ReadonlySet<string>): SessionSettings {
  const topicIds = (params.get("topics") ?? "")
    .split(",")
    .filter((t) => knownTopics.has(t));
  return { topicIds, goal: parseGoal(params.get("goal")) };
}
