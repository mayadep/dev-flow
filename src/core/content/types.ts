/**
 * 콘텐츠 팩 스키마.
 *
 * 학습 엔진은 이 타입만 알고, 특정 주제(Git, HTTP 등)는 전혀 모른다.
 * 새 주제는 ContentPack 하나를 만들어 레지스트리에 등록하면 끝난다.
 */

/** 1(입문) ~ 5(심화). 엔진의 실력 레벨과 같은 축을 쓴다. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

interface QuestionBase {
  /** 팩 안에서 고유하고, 한 번 배포되면 바꾸지 않는다(학습 기록이 이 id에 묶인다). */
  id: string;
  difficulty: Difficulty;
  prompt: string;
  /** 선택: 문제와 함께 보여줄 코드/명령어 블록 */
  code?: string;
  /** 정답/오답 후 바로 보여주는 해설 */
  explanation: string;
  /** 막혔을 때 단계적으로 공개하는 힌트(앞에서부터 하나씩) */
  hints: string[];
  /** 예상 풀이 시간(초). 없으면 난이도로 추정한다. */
  expectedSec?: number;
  tags?: string[];
}

/** 보기 중 하나를 고르는 문제 (OX 문제도 보기 2개짜리 choice로 표현) */
export interface ChoiceQuestion extends QuestionBase {
  kind: "choice";
  choices: string[];
  answer: number;
}

/**
 * 문제 유형 합집합. 유형을 추가하려면
 * 1) 여기에 타입 추가 2) core/content/kinds.ts 에 채점기 등록 3) ui 렌더러 등록.
 */
export type Question = ChoiceQuestion;
export type QuestionKind = Question["kind"];

export interface Topic {
  id: string;
  title: string;
  emoji: string;
  description: string;
  questions: Question[];
}

export interface ContentPack {
  id: string;
  title: string;
  description: string;
  /** 콘텐츠 개정 시 올린다(캐시 무효화·마이그레이션 판단용) */
  version: number;
  topics: Topic[];
}

/** 엔진이 다루는 문제 단위: 어느 토픽에 속했는지가 붙어 있다. */
export interface QuestionRef {
  topicId: string;
  question: Question;
}
