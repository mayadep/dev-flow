import { describe, expect, it } from "vitest";
import { catalog, packs } from "@/content";

describe("콘텐츠 팩 무결성", () => {
  it("카탈로그가 중복 없이 만들어진다", () => {
    expect(catalog.topics.length).toBeGreaterThan(0);
  });

  for (const pack of packs) {
    for (const topic of pack.topics) {
      describe(`${pack.id}/${topic.id}`, () => {
        it("문제 id는 토픽 id로 시작한다", () => {
          for (const q of topic.questions) expect(q.id.startsWith(`${topic.id}.`)).toBe(true);
        });

        it("정답 인덱스가 보기 범위 안이고 보기는 중복이 없다", () => {
          for (const q of topic.questions) {
            expect(q.choices.length, q.id).toBeGreaterThanOrEqual(2);
            expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
            expect(q.answer, q.id).toBeLessThan(q.choices.length);
            expect(new Set(q.choices).size, q.id).toBe(q.choices.length);
          }
        });

        it("힌트와 해설이 있다", () => {
          for (const q of topic.questions) {
            expect(q.hints.length, q.id).toBeGreaterThan(0);
            expect(q.explanation.length, q.id).toBeGreaterThan(10);
          }
        });

        it("난이도 1~5가 모두 있어 적응형 조절이 가능하다", () => {
          const levels = new Set(topic.questions.map((q) => q.difficulty));
          expect([...levels].sort()).toEqual([1, 2, 3, 4, 5]);
        });
      });
    }
  }
});
