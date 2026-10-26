"use client";

import { catalog } from "@/content";
import { localDateKey, type LearnerState } from "@/core/learner/state";
import { recentAccuracy } from "@/core/engine/skill";
import { Card, LevelBar, Loading, PageTitle } from "../components/primitives";
import { useClock } from "../hooks/use-clock";
import { engineConfig } from "../learner/runtime";
import { useLearner } from "../learner/use-learner";
import { goalLabel } from "../session/settings-url";

const DAYS = 14;

function lastDays(state: LearnerState, now: Date) {
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const key = localDateKey(d.toISOString());
    return { key, label: `${d.getMonth() + 1}/${d.getDate()}`, answered: state.daily[key]?.answered ?? 0 };
  });
}

export function StatsScreen() {
  const { ready, state } = useLearner();
  const now = useClock();

  if (!ready || !now) return <Loading />;

  const days = lastDays(state, new Date(now));

  const max = Math.max(1, ...days.map((d) => d.answered));
  const total = state.totalAnswered;
  const accuracy = total ? Math.round((state.totalCorrect / total) * 100) : 0;

  return (
    <>
      <PageTitle sub={`지금까지 ${total}문제 · 정답률 ${accuracy}%`}>기록</PageTitle>

      <Card className="mb-4">
        <h2 className="mb-4 font-semibold">최근 2주</h2>
        <div className="flex h-28 items-end gap-1" role="img" aria-label="최근 14일 푼 문제 수">
          {days.map((d) => (
            <div key={d.key} className="flex h-full flex-1 flex-col justify-end">
              <div
                className={`w-full rounded-t-md ${d.answered ? "bg-accent" : "bg-surface-2"}`}
                style={{ height: `${Math.max(4, (d.answered / max) * 100)}%` }}
                title={`${d.label}: ${d.answered}문제`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>{days[0].label}</span>
          <span>오늘</span>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">주제별 실력</h2>
        <p className="mb-4 text-xs text-muted">
          레벨은 최근 정답률이 {engineConfig.targetLow * 100}~{engineConfig.targetHigh * 100}%에 머물도록 자동으로 움직여.
        </p>
        <ul className="space-y-4">
          {catalog.topics.map((t) => {
            const skill = state.skills[t.id];
            const level = skill?.level ?? engineConfig.initialLevel;
            const recent = skill ? recentAccuracy(skill) : null;
            return (
              <li key={t.id}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span>
                    {t.emoji} {t.title}
                  </span>
                  <span className="tabular-nums text-muted">Lv {level.toFixed(1)}</span>
                </div>
                <LevelBar level={level} />
                <p className="mt-1 text-xs text-muted">
                  {skill
                    ? `${skill.attempts}문제 · 누적 ${Math.round((skill.correct / skill.attempts) * 100)}%` +
                      (recent !== null ? ` · 최근 ${Math.round(recent * 100)}%` : "")
                    : "아직 안 풀어봤어"}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">최근 세션</h2>
        {state.sessions.length === 0 ? (
          <p className="text-sm text-muted">첫 세션을 시작해 봐.</p>
        ) : (
          <ul className="divide-y divide-line">
            {state.sessions.slice(0, 10).map((s) => (
              <li key={s.id} className="flex justify-between py-2.5 text-sm">
                <span>
                  {new Date(s.endedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  <span className="ml-2 text-muted">{goalLabel(s.goal)}</span>
                </span>
                <span className="tabular-nums">
                  {s.correct}/{s.answered}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
