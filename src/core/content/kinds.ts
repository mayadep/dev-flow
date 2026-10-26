import type { Question, QuestionKind } from "./types";

/** 문제 유형별 응답 형태. 유형이 늘면 여기에 추가한다. */
export type ResponseByKind = {
  choice: { kind: "choice"; selected: number };
};
export type QuestionResponse = ResponseByKind[QuestionKind];

/** 문제를 화면에 낼 때의 배치(보기 순서 등). 같은 문제도 매번 다르게 보여 위치 암기를 막는다. */
export type PresentationByKind = {
  choice: { kind: "choice"; order: number[] };
};
export type QuestionPresentation = PresentationByKind[QuestionKind];

type Grader<K extends QuestionKind> = (
  question: Extract<Question, { kind: K }>,
  response: ResponseByKind[K],
) => boolean;

const graders: { [K in QuestionKind]: Grader<K> } = {
  choice: (q, r) => q.answer === r.selected,
};

export function grade(question: Question, response: QuestionResponse): boolean {
  if (question.kind !== response.kind) return false;
  const grader = graders[question.kind] as Grader<typeof question.kind>;
  return grader(question, response);
}

type Presenter<K extends QuestionKind> = (
  question: Extract<Question, { kind: K }>,
  random: () => number,
) => PresentationByKind[K];

const presenters: { [K in QuestionKind]: Presenter<K> } = {
  choice: (q, random) => ({ kind: "choice", order: shuffle(q.choices.map((_, i) => i), random) }),
};

export function present(question: Question, random: () => number): QuestionPresentation {
  const presenter = presenters[question.kind] as Presenter<typeof question.kind>;
  return presenter(question, random);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
