/**
 * 적응형 난이도 엔진 파라미터.
 * 목표 정답률 70~85%는 연구 수치가 아니라 경험칙이다. 바꾸고 싶으면 여기만 고치면 된다.
 */
export interface EngineConfig {
  /** 이 정답률 미만이면 난이도를 내린다 */
  targetLow: number;
  /** 이 정답률 초과면 난이도를 올린다 */
  targetHigh: number;
  /** 정답률을 계산할 최근 시도 수 */
  window: number;
  /** 토픽별로 이 횟수까지는 매 문제마다 빠르게 레벨을 맞춘다(초기 보정) */
  calibrationAttempts: number;
  calibrationStep: number;
  /** 보정 이후 한 번에 움직이는 레벨 폭 */
  step: number;
  /** 레벨 조정 직후 남겨둘 최근 기록 수(연속 조정을 막는 히스테리시스) */
  keepAfterAdjust: number;
  /** 예상 시간 대비 이 비율보다 빨리 맞히면 '너무 쉬움' 신호 */
  fastRatio: number;
  /** '너무 쉬움' 신호가 연속 몇 번이면 레벨을 올릴지 */
  fastStreakToBoost: number;
  /** 예상 시간 대비 이 비율을 넘기면 '막힘'으로 보고 힌트를 권한다 */
  stuckRatio: number;
  /** 힌트를 쓰고 맞힌 경우의 점수(0~1) */
  hintedCorrectScore: number;
  minLevel: number;
  maxLevel: number;
  initialLevel: number;
}

export const defaultEngineConfig: EngineConfig = {
  targetLow: 0.7,
  targetHigh: 0.85,
  window: 8,
  calibrationAttempts: 4,
  calibrationStep: 0.5,
  step: 0.5,
  keepAfterAdjust: 2,
  fastRatio: 0.35,
  fastStreakToBoost: 3,
  stuckRatio: 1.5,
  hintedCorrectScore: 0.6,
  minLevel: 1,
  maxLevel: 5,
  initialLevel: 1.5,
};
