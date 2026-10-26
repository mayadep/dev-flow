import { describe, expect, it } from "vitest";
import { defaultEngineConfig as config } from "@/core/engine/config";
import { applyToMemory } from "@/core/engine/memory";
import { selectNext } from "@/core/engine/selector";
import { applyToSkill, initialSkill, type SkillInput, type TopicSkill } from "@/core/engine/skill";
import { catalog } from "@/content";

const right: SkillInput = { correct: true, hintsUsed: 0, pace: "normal" };
const wrong: SkillInput = { correct: false, hintsUsed: 0, pace: "normal" };
const fast: SkillInput = { correct: true, hintsUsed: 0, pace: "fast" };

function run(inputs: SkillInput[], start: TopicSkill = initialSkill("t", config)) {
  return inputs.reduce((s, i) => applyToSkill(s, i, config).skill, start);
}

describe("적응형 난이도", () => {
  it("초기 보정 구간에선 맞히면 오르고 틀리면 내린다", () => {
    expect(run([right]).level).toBe(config.initialLevel + config.calibrationStep);
    expect(run([wrong]).level).toBe(config.initialLevel - config.calibrationStep);
  });

  it("목표 구간(70~85%) 안이면 레벨을 유지한다", () => {
    const calibrated = run([right, wrong, right, wrong]);
    // 이후 4문제 중 3개 정답(75%) 패턴 반복
    const after = run([right, right, wrong, right, right, right, wrong, right], calibrated);
    const accs = after.recent.reduce((a, b) => a + b, 0) / after.recent.length;
    expect(accs).toBeGreaterThanOrEqual(config.targetLow);
    expect(after.level).toBe(calibrated.level);
  });

  it("계속 맞히면 오르고 계속 틀리면 내린다", () => {
    const base = run([right, wrong, right, wrong]);
    expect(run(Array(8).fill(right), base).level).toBeGreaterThan(base.level);
    expect(run(Array(8).fill(wrong), base).level).toBeLessThan(base.level);
  });

  it("빠르게 연속으로 맞히면(지루함) 정답률 판단보다 먼저 올린다", () => {
    const base = run([right, wrong, right, wrong]);
    const s = run([fast, fast, fast], base);
    expect(s.level).toBe(base.level + config.step);
    expect(s.fastStreak).toBe(0);
  });

  it("레벨은 1~5를 벗어나지 않는다", () => {
    expect(run(Array(60).fill(right)).level).toBe(config.maxLevel);
    expect(run(Array(60).fill(wrong)).level).toBe(config.minLevel);
  });

  it("힌트를 보고 맞히면 부분 점수", () => {
    const { skill } = applyToSkill(initialSkill("t", config), { correct: true, hintsUsed: 1, pace: "normal" }, config);
    expect(skill.recent).toEqual([config.hintedCorrectScore]);
  });
});

describe("복습 간격(라이트너)", () => {
  it("틀리면 0번 상자, 맞히면 다음 상자", () => {
    const at = "2026-01-01T00:00:00.000Z";
    const m1 = applyToMemory(undefined, "q", true, 0, at);
    expect(m1.box).toBe(1);
    const m2 = applyToMemory(m1, "q", false, 0, at);
    expect(m2.box).toBe(0);
    expect(Date.parse(m2.dueAt)).toBeGreaterThan(Date.parse(at));
  });
});

describe("문제 선택", () => {
  const pool = catalog.pool(["git"]);
  const base = {
    pool,
    memory: {},
    askedInSession: new Set<string>(),
    now: Date.parse("2026-01-01T00:00:00Z"),
    config,
    random: () => 0,
  };

  it("현재 레벨에 가까운 난이도를 고른다", () => {
    for (const level of [1, 3, 5]) {
      const sel = selectNext({ ...base, skills: { git: { ...initialSkill("git", config), level } } });
      expect(sel).not.toBeNull();
      expect(Math.abs(sel!.ref.question.difficulty - level)).toBeLessThanOrEqual(0.5);
    }
  });

  it("이번 세션에 낸 문제는 다시 내지 않고, 다 내면 null", () => {
    const asked = new Set<string>();
    for (let i = 0; i < pool.length; i++) {
      const sel = selectNext({ ...base, skills: {}, askedInSession: asked });
      expect(asked.has(sel!.ref.question.id)).toBe(false);
      asked.add(sel!.ref.question.id);
    }
    expect(selectNext({ ...base, skills: {}, askedInSession: asked })).toBeNull();
  });
});
