import type { QuestionRef } from "../content/types";
import type { EngineConfig } from "./config";
import { isDue, type QuestionMemory } from "./memory";
import { initialSkill, type TopicSkill } from "./skill";

export interface SelectionContext {
  pool: readonly QuestionRef[];
  skills: Readonly<Record<string, TopicSkill>>;
  memory: Readonly<Record<string, QuestionMemory>>;
  /** 이번 세션에서 이미 낸 문제 id */
  askedInSession: ReadonlySet<string>;
  /** 이번 세션에서 직전에 낸 토픽(같은 토픽 연속을 살짝 피한다) */
  lastTopicId?: string;
  now: number;
  config: EngineConfig;
  /** 0~1 난수. 테스트에서 고정값을 넣는다. */
  random: () => number;
}

export type SelectionReason = "review" | "new" | "practice";

export interface Selection {
  ref: QuestionRef;
  reason: SelectionReason;
}

/**
 * 다음 문제 선택.
 * 1) 복습 기한이 지난 문제 중 현재 실력에 가까운 것을 일정 확률로 우선
 * 2) 아니면 토픽 실력 레벨과 난이도가 가장 가까운 문제(안 본 문제 우대)
 */
export function selectNext(ctx: SelectionContext): Selection | null {
  const candidates = ctx.pool.filter((r) => !ctx.askedInSession.has(r.question.id));
  if (candidates.length === 0) return null;

  const levelOf = (topicId: string) => (ctx.skills[topicId] ?? initialSkill(topicId, ctx.config)).level;
  const distance = (r: QuestionRef) => Math.abs(r.question.difficulty - levelOf(r.topicId));

  const due = candidates.filter((r) => {
    const m = ctx.memory[r.question.id];
    return m && isDue(m, ctx.now) && distance(r) <= 1.5;
  });
  if (due.length > 0 && ctx.random() < 0.35) {
    return { ref: pickBest(due, (r) => distance(r) + ctx.random() * 0.5), reason: "review" };
  }

  const ref = pickBest(candidates, (r) => {
    const m = ctx.memory[r.question.id];
    // 이미 잘 아는(상자 높은) 문제일수록 뒤로, 안 본 문제는 앞으로
    const familiarity = m ? 0.3 + m.box * 0.25 : 0;
    // 아직 기한 안 된 문제는 감점
    const notDue = m && !isDue(m, ctx.now) ? 0.6 : 0;
    const sameTopic = r.topicId === ctx.lastTopicId ? 0.3 : 0;
    return distance(r) + familiarity + notDue + sameTopic + ctx.random() * 0.4;
  });
  const m = ctx.memory[ref.question.id];
  return { ref, reason: m ? "practice" : "new" };
}

function pickBest<T>(items: readonly T[], cost: (t: T) => number): T {
  let best = items[0];
  let bestCost = Infinity;
  for (const item of items) {
    const c = cost(item);
    if (c < bestCost) {
      best = item;
      bestCost = c;
    }
  }
  return best;
}
