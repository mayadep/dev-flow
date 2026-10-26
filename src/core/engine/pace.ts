import type { Question } from "../content/types";
import type { EngineConfig } from "./config";

/** 문제 하나에 기대하는 풀이 시간(ms). 명시값이 없으면 난이도와 지문 길이로 추정. */
export function expectedMs(question: Question): number {
  if (question.expectedSec) return question.expectedSec * 1000;
  const reading = (question.prompt.length + (question.code?.length ?? 0)) * 60;
  return 8000 + question.difficulty * 4000 + reading;
}

export type Pace = "fast" | "normal" | "slow";

/** 답을 낸 뒤의 속도 판정: 지루함(너무 빠름)과 버거움(너무 느림) 신호 */
export function classifyPace(question: Question, responseMs: number, config: EngineConfig): Pace {
  const ratio = responseMs / expectedMs(question);
  if (ratio <= config.fastRatio) return "fast";
  if (ratio >= config.stuckRatio) return "slow";
  return "normal";
}

/** 풀고 있는 도중 '막힘' 판단: 이 시점부터 힌트/쪼개기를 권한다. */
export function stuckAfterMs(question: Question, config: EngineConfig): number {
  return expectedMs(question) * config.stuckRatio;
}
