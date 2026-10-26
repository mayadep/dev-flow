import type { EngineConfig } from "./config";
import type { Pace } from "./pace";

/** 토픽별 실력 상태. level은 문제 난이도(1~5)와 같은 축의 연속값이다. */
export interface TopicSkill {
  topicId: string;
  level: number;
  /** 최근 시도 점수(0~1), 오래된 것부터 */
  recent: number[];
  attempts: number;
  correct: number;
  fastStreak: number;
}

export interface SkillInput {
  correct: boolean;
  hintsUsed: number;
  pace: Pace;
}

export type LevelChange = "up" | "down" | "none";

export function initialSkill(topicId: string, config: EngineConfig): TopicSkill {
  return { topicId, level: config.initialLevel, recent: [], attempts: 0, correct: 0, fastStreak: 0 };
}

export function attemptScore(input: SkillInput, config: EngineConfig): number {
  if (!input.correct) return 0;
  return input.hintsUsed > 0 ? config.hintedCorrectScore : 1;
}

export function recentAccuracy(skill: TopicSkill): number | null {
  if (skill.recent.length === 0) return null;
  return skill.recent.reduce((a, b) => a + b, 0) / skill.recent.length;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 시도 하나를 반영한 새 실력 상태를 돌려준다(순수 함수).
 *
 * - 초기 보정 구간: 맞히면 올리고 틀리면 내려서 빠르게 제자리를 찾는다.
 * - 이후: 최근 정답률이 목표 구간(70~85%)을 벗어날 때만 조정한다.
 * - 힌트 없이 빠르게 연속 정답이면(지루함 신호) 정답률과 무관하게 올린다.
 */
export function applyToSkill(
  skill: TopicSkill,
  input: SkillInput,
  config: EngineConfig,
): { skill: TopicSkill; change: LevelChange } {
  const score = attemptScore(input, config);
  const recent = [...skill.recent, score].slice(-config.window);
  const attempts = skill.attempts + 1;
  const correct = skill.correct + (input.correct ? 1 : 0);
  const fastStreak = input.correct && input.hintsUsed === 0 && input.pace === "fast" ? skill.fastStreak + 1 : 0;

  let delta = 0;
  let keepRecent = recent;
  let nextFastStreak = fastStreak;

  if (attempts <= config.calibrationAttempts) {
    delta = score >= 1 ? config.calibrationStep : score === 0 ? -config.calibrationStep : 0;
  } else if (fastStreak >= config.fastStreakToBoost) {
    delta = config.step;
    nextFastStreak = 0;
  } else if (recent.length >= Math.ceil(config.window / 2)) {
    const acc = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (acc > config.targetHigh) delta = config.step;
    else if (acc < config.targetLow) delta = -config.step;
  }

  const level = clamp(skill.level + delta, config.minLevel, config.maxLevel);
  const moved = level !== skill.level;
  if (attempts === config.calibrationAttempts) {
    // 보정 구간 기록은 매번 다른 레벨에서 얻은 것이라 목표 정답률 판단에서 뺀다
    keepRecent = [];
  } else if (moved && attempts > config.calibrationAttempts) {
    keepRecent = recent.slice(-config.keepAfterAdjust);
  }

  return {
    skill: { ...skill, level, recent: keepRecent, attempts, correct, fastStreak: nextFastStreak },
    change: !moved ? "none" : level > skill.level ? "up" : "down",
  };
}
