"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useClock } from "../hooks/use-clock";
import { catalog } from "@/content";
import { stuckAfterMs } from "@/core/engine/pace";
import type { Difficulty } from "@/core/content/types";
import {
  goalProgress,
  levelDeltas,
  type SessionSettings,
  type SessionState,
} from "@/core/session/session";
import { Button, Card, Loading } from "../components/primitives";
import { engineConfig, getLearnerStore } from "../learner/runtime";
import { useLearner } from "../learner/use-learner";
import { QuestionBody } from "./question-views";
import { fromSearch, goalLabel } from "./settings-url";
import { useSession } from "./use-session";

export function SessionScreen() {
  const params = useSearchParams();
  const { ready } = useLearner();
  const settings = useMemo(
    () => fromSearch(new URLSearchParams(params.toString()), new Set(catalog.topics.map((t) => t.id))),
    [params],
  );
  // 학습 기록이 로드된 뒤에야 실력에 맞는 첫 문제를 고를 수 있다
  if (!ready) return <Loading />;
  return <SessionRunner settings={settings} />;
}

function SessionRunner({ settings }: { settings: SessionSettings }) {
  const s = useSession(settings);
  const router = useRouter();
  const { state } = s;

  useEffect(() => {
    if (state.phase === "done") router.push("/");
  }, [state.phase, router]);

  switch (state.phase) {
    case "question":
    case "feedback":
      return (
        <QuestionStage
          state={state}
          onAnswer={s.answer}
          onHint={s.hint}
          onNext={s.next}
          onQuit={s.quit}
        />
      );
    case "summary":
      return <SummaryStage state={state} onContinue={s.toRelax} />;
    case "relax":
      return <RelaxStage onDone={s.toMemo} />;
    case "memo":
      return <MemoStage sessionId={state.id} onDone={s.complete} />;
    case "done":
      return <Loading />;
  }
}

/* ───────────────────────── 문제 / 피드백 ───────────────────────── */

function DifficultyDots({ value }: { value: Difficulty }) {
  return (
    <span className="flex gap-0.5" aria-label={`난이도 ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-3 rounded-full ${i <= value ? "bg-accent" : "bg-surface-2"}`} />
      ))}
    </span>
  );
}

function QuestionStage({
  state,
  onAnswer,
  onHint,
  onNext,
  onQuit,
}: {
  state: SessionState;
  onAnswer: ReturnType<typeof useSession>["answer"];
  onHint: () => void;
  onNext: () => void;
  onQuit: () => void;
}) {
  const current = state.current!;
  const { question, topicId } = current.selection.ref;
  const topic = catalog.topic(topicId)!;
  const inFeedback = state.phase === "feedback";
  const now = useClock();
  const stuck = !inFeedback && now - current.shownAt > stuckAfterMs(question, engineConfig);
  const hintsLeft = question.hints.length - current.hintsShown;
  const result = state.lastResult;
  const [memoOpen, setMemoOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100dvh-40px)] flex-col">
      {/* 상단: 진행률 + 종료 */}
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={onQuit} className="-ml-2 p-2 text-muted" aria-label="세션 끝내기">
          ✕
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${goalProgress(state, now) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted">
          {state.correct}/{state.answered}
        </span>
        <button type="button" onClick={() => setMemoOpen(true)} className="-mr-2 p-2" aria-label="떠오른 생각 메모">
          💡
        </button>
      </div>

      <div key={question.id} className="animate-pop">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>
            {topic.emoji} {topic.title}
            {current.selection.reason === "review" && <span className="ml-2 text-warn">복습</span>}
          </span>
          <DifficultyDots value={question.difficulty} />
        </div>

        <h2 className="mb-3 text-lg font-semibold leading-relaxed">{question.prompt}</h2>
        {question.code && (
          <pre className="mb-4 overflow-x-auto rounded-2xl bg-surface-2 p-4 font-mono text-[13px] leading-relaxed">
            {question.code}
          </pre>
        )}

        <QuestionBody
          question={question}
          presentation={current.presentation}
          answered={result?.response ?? null}
          onAnswer={onAnswer}
        />

        {/* 힌트 */}
        {current.hintsShown > 0 && (
          <ul className="mt-4 space-y-2">
            {question.hints.slice(0, current.hintsShown).map((h, i) => (
              <li key={i} className="rounded-2xl bg-warn-soft px-4 py-3 text-sm">
                💡 {h}
              </li>
            ))}
          </ul>
        )}
        {!inFeedback && hintsLeft > 0 && (
          <div className="mt-4">
            {stuck && current.hintsShown === 0 && (
              <p className="mb-2 text-sm text-muted">조금 막혔지? 힌트 하나 보고 가도 괜찮아.</p>
            )}
            <Button variant={stuck ? "secondary" : "ghost"} className="w-full" onClick={onHint}>
              힌트 보기 ({hintsLeft})
            </Button>
          </div>
        )}
      </div>

      {/* 피드백 */}
      {inFeedback && result && (
        <div className="mt-5 animate-pop">
          <Card className={result.correct ? "!border-good" : "!border-bad"}>
            <p className={`mb-1 font-bold ${result.correct ? "text-good" : "text-bad"}`}>
              {result.correct ? "정답!" : "아쉽다, 다시 보자"}
            </p>
            <p className="text-[15px] leading-relaxed">{question.explanation}</p>
            <FlowNote change={result.change} pace={result.pace} correct={result.correct} />
          </Card>
          <Button className="mt-4 w-full" onClick={onNext}>
            다음
          </Button>
        </div>
      )}

      {memoOpen && <QuickMemo sessionId={state.id} onClose={() => setMemoOpen(false)} />}
    </div>
  );
}

function FlowNote({
  change,
  pace,
  correct,
}: {
  change: "up" | "down" | "none";
  pace: "fast" | "normal" | "slow";
  correct: boolean;
}) {
  let text: string | null = null;
  if (change === "up") text = pace === "fast" ? "너무 쉬워 보여서 난이도를 올릴게 ↑" : "좋은 흐름이야. 한 단계 어려운 걸로 ↑";
  else if (change === "down") text = "조금 쉬운 문제로 리듬을 다시 잡자 ↓";
  else if (correct && pace === "fast") text = "빠르다! 이대로면 곧 난이도가 올라가.";
  if (!text) return null;
  return <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{text}</p>;
}

/* ───────────────────────── 요약 ───────────────────────── */

function SummaryStage({ state, onContinue }: { state: SessionState; onContinue: () => void }) {
  const accuracy = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
  const deltas = levelDeltas(state, engineConfig);
  const now = useClock();
  const reached = goalProgress(state, now) >= 1 || state.exhausted;
  const inFlow = accuracy >= engineConfig.targetLow * 100 && accuracy <= engineConfig.targetHigh * 100;

  return (
    <div className="animate-pop pt-6">
      <p className="text-sm text-muted">{goalLabel(state.settings.goal)} 세션</p>
      <h1 className="mb-6 text-2xl font-bold">{reached ? "세션 완료 🎉" : "오늘은 여기까지"}</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-xs text-muted">푼 문제</p>
          <p className="mt-1 text-2xl font-bold">{state.answered}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-muted">정답률</p>
          <p className="mt-1 text-2xl font-bold">{accuracy}%</p>
        </Card>
      </div>

      {state.answered > 0 && (
        <p className="mb-4 text-sm text-muted">
          {inFlow
            ? "딱 몰입하기 좋은 난이도였어."
            : accuracy > engineConfig.targetHigh * 100
              ? "여유 있었지? 다음 세션은 조금 더 도전적으로 갈게."
              : "버거웠던 만큼 기억엔 더 남아. 다음엔 조금 쉽게 시작할게."}
        </p>
      )}

      {deltas.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">레벨 변화</h2>
          <ul className="space-y-2">
            {deltas.map((d) => {
              const t = catalog.topic(d.topicId);
              const diff = d.after - d.before;
              return (
                <li key={d.topicId} className="flex items-center justify-between text-sm">
                  <span>
                    {t?.emoji} {t?.title}
                  </span>
                  <span className="tabular-nums">
                    Lv {d.before.toFixed(1)} → <b>{d.after.toFixed(1)}</b>
                    {diff !== 0 && (
                      <span className={diff > 0 ? "ml-1 text-good" : "ml-1 text-bad"}>{diff > 0 ? "▲" : "▼"}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Button className="w-full" onClick={onContinue}>
        잠깐 쉬어가기
      </Button>
    </div>
  );
}

/* ───────────────────────── 이완 ───────────────────────── */

const RELAX_OPTIONS = [1, 3, 5];
const RELAX_PROMPTS = [
  "화면에서 눈을 떼고 먼 곳을 바라봐.",
  "숨을 천천히 들이쉬고, 더 천천히 내쉬어.",
  "방금 푼 문제를 굳이 떠올리려 하지 마.",
  "생각이 흘러가는 대로 둬. 떠오르는 게 있으면 그걸로 충분해.",
];

function RelaxStage({ onDone }: { onDone: () => void }) {
  const [minutes, setMinutes] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const now = useClock();

  const remaining = minutes === null ? 0 : Math.max(0, minutes * 60_000 - (now - startedAt));
  const finished = minutes !== null && remaining === 0;
  const prompt = RELAX_PROMPTS[Math.floor((now - startedAt) / 20_000) % RELAX_PROMPTS.length];

  if (minutes === null) {
    return (
      <div className="animate-pop pt-6">
        <h1 className="mb-2 text-2xl font-bold">멍 때리기</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          집중한 뒤 잠깐 쉬면 머릿속에서 정리가 일어나. 아이디어는 보통 이럴 때 떠올라.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {RELAX_OPTIONS.map((m) => (
            <Button
              key={m}
              variant="secondary"
              onClick={() => {
                setStartedAt(Date.now());
                setMinutes(m);
              }}
            >
              {m}분
            </Button>
          ))}
        </div>
        <Button variant="ghost" className="mt-4 w-full" onClick={onDone}>
          건너뛰고 메모 쓰기
        </Button>
      </div>
    );
  }

  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000);

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
      <div className="relative mb-10 flex h-56 w-56 items-center justify-center">
        <div className="animate-breathe absolute inset-0 rounded-full bg-accent-soft" />
        <span className="relative text-3xl font-light tabular-nums">
          {mm}:{String(ss).padStart(2, "0")}
        </span>
      </div>
      <p className="mb-10 min-h-12 max-w-xs text-muted">{finished ? "잘 쉬었어. 떠오른 게 있으면 적어 두자." : prompt}</p>
      <Button className="w-full" variant={finished ? "primary" : "ghost"} onClick={onDone}>
        {finished ? "메모 쓰기" : "그만 쉬기"}
      </Button>
    </div>
  );
}

/* ───────────────────────── 메모 ───────────────────────── */

const MEMO_PROMPTS = [
  "쉬는 동안 떠오른 생각이 있어?",
  "오늘 문제 중에 내 프로젝트에 써먹을 만한 게 있었어?",
  "헷갈렸던 개념을 내 말로 한 줄 정리해 볼까?",
];

function MemoStage({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [placeholder] = useState(() => MEMO_PROMPTS[Math.floor(Math.random() * MEMO_PROMPTS.length)]);

  const save = () => {
    if (text.trim()) getLearnerStore().createMemo(text.trim(), sessionId);
    onDone();
  };

  return (
    <div className="animate-pop pt-6">
      <h1 className="mb-2 text-2xl font-bold">떠오른 것 적기</h1>
      <p className="mb-4 text-sm text-muted">없으면 그냥 넘어가도 돼.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={7}
        className="mb-4 w-full rounded-2xl border border-line bg-surface p-4 text-base outline-none focus:border-accent"
      />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onDone}>
          넘어가기
        </Button>
        <Button onClick={save} disabled={!text.trim()}>
          저장
        </Button>
      </div>
      <Link href="/notes" className="mt-6 block text-center text-sm text-accent">
        지난 메모 보기
      </Link>
    </div>
  );
}

function QuickMemo({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [text, setText] = useState("");
  const save = () => {
    if (text.trim()) getLearnerStore().createMemo(text.trim(), sessionId);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="animate-pop mx-auto w-full max-w-md rounded-t-3xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 font-semibold">💡 잊기 전에 적어 두기</h2>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="문제 풀다 떠오른 아이디어"
          className="mb-3 w-full rounded-2xl border border-line bg-bg p-3 text-base outline-none focus:border-accent"
        />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={save} disabled={!text.trim()}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
