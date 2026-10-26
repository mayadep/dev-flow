"use client";

import type { ComponentType } from "react";
import type { PresentationByKind, QuestionResponse, ResponseByKind } from "@/core/content/kinds";
import type { Question, QuestionKind } from "@/core/content/types";

/**
 * 문제 유형별 화면 렌더러. 새 유형은 여기에 컴포넌트만 등록하면 세션 화면이 그대로 쓴다.
 * answered가 있으면 채점 결과를 함께 보여주는 '피드백 모드'.
 */
export interface QuestionViewProps<K extends QuestionKind> {
  question: Extract<Question, { kind: K }>;
  presentation: PresentationByKind[K];
  answered: ResponseByKind[K] | null;
  onAnswer: (response: ResponseByKind[K]) => void;
}

function ChoiceView({ question, presentation, answered, onAnswer }: QuestionViewProps<"choice">) {
  return (
    <ol className="space-y-2.5">
      {presentation.order.map((idx, pos) => {
        const isAnswer = idx === question.answer;
        const isPicked = answered?.selected === idx;
        let tone = "border-line bg-surface active:bg-surface-2";
        if (answered) {
          if (isAnswer) tone = "border-good bg-good-soft";
          else if (isPicked) tone = "border-bad bg-bad-soft";
          else tone = "border-line bg-surface opacity-60";
        }
        return (
          <li key={idx}>
            <button
              type="button"
              disabled={!!answered}
              onClick={() => onAnswer({ kind: "choice", selected: idx })}
              className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] leading-snug transition ${tone}`}
            >
              <span className="mt-px w-5 shrink-0 font-semibold text-muted">{String.fromCharCode(65 + pos)}</span>
              <span className="flex-1">{question.choices[idx]}</span>
              {answered && isAnswer && <span aria-label="정답">✓</span>}
              {answered && isPicked && !isAnswer && <span aria-label="내 선택">✕</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

const views: { [K in QuestionKind]: ComponentType<QuestionViewProps<K>> } = {
  choice: ChoiceView,
};

export function QuestionBody(props: {
  question: Question;
  presentation: PresentationByKind[QuestionKind];
  answered: QuestionResponse | null;
  onAnswer: (r: QuestionResponse) => void;
}) {
  const View = views[props.question.kind] as ComponentType<QuestionViewProps<QuestionKind>>;
  return <View {...(props as QuestionViewProps<QuestionKind>)} />;
}
