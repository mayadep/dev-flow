"use client";

import Link from "next/link";
import { catalog } from "@/content";
import { localDateKey, streakDays } from "@/core/learner/state";
import { Card, Chip, LevelBar, PageTitle } from "../components/primitives";
import { useClock } from "../hooks/use-clock";
import { usePref } from "../hooks/use-pref";
import { engineConfig } from "../learner/runtime";
import { useLearner } from "../learner/use-learner";
import { DEFAULT_GOAL_ID, GOAL_PRESETS, toSearch } from "../session/settings-url";

interface HomePrefs {
  topicIds: string[];
  goalId: string;
}

const PREFS_KEY = "home";

const DEFAULT_PREFS: HomePrefs = { topicIds: [], goalId: DEFAULT_GOAL_ID };

export function HomeScreen() {
  const { ready, state } = useLearner();
  const [prefs, update] = usePref<HomePrefs>(PREFS_KEY, DEFAULT_PREFS);
  const now = useClock();
  const today =
    ready && now
      ? {
          answered: state.daily[localDateKey(new Date(now).toISOString())]?.answered ?? 0,
          streak: streakDays(state, new Date(now)),
        }
      : null;

  const toggleTopic = (id: string) =>
    update({
      ...prefs,
      topicIds: prefs.topicIds.includes(id) ? prefs.topicIds.filter((t) => t !== id) : [...prefs.topicIds, id],
    });

  const goal = GOAL_PRESETS.find((g) => g.id === prefs.goalId) ?? GOAL_PRESETS[1];
  const href = `/learn?${toSearch({ topicIds: prefs.topicIds, goal: goal.goal })}`;

  return (
    <>
      <PageTitle sub="심심할 때 한 세션, 짧게 몰입하고 쉬어가기">dev flow</PageTitle>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-xs text-muted">오늘 푼 문제</p>
          <p className="mt-1 text-2xl font-bold">{today?.answered ?? "–"}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-muted">연속 학습</p>
          <p className="mt-1 text-2xl font-bold">{today ? `${today.streak}일` : "–"}</p>
        </Card>
      </div>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">이번 세션 목표</h2>
        <div className="flex flex-wrap gap-2">
          {GOAL_PRESETS.map((g) => (
            <Chip key={g.id} selected={g.id === goal.id} onClick={() => update({ ...prefs, goalId: g.id })}>
              {g.label}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">주제</h2>
          <button type="button" className="text-sm text-accent" onClick={() => update({ ...prefs, topicIds: [] })}>
            전체 섞기
          </button>
        </div>
        <ul className="space-y-2">
          {catalog.topics.map((t) => {
            const selected = prefs.topicIds.includes(t.id);
            const level = state.skills[t.id]?.level ?? engineConfig.initialLevel;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTopic(t.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    selected ? "border-accent bg-accent-soft" : "border-line"
                  }`}
                >
                  <span aria-hidden className="text-2xl">
                    {t.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t.title}</span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <LevelBar level={level} />
                      <span className="shrink-0 text-xs tabular-nums text-muted">Lv {level.toFixed(1)}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted">
          {prefs.topicIds.length === 0 ? "아무것도 안 고르면 전체 주제를 섞어서 내." : `${prefs.topicIds.length}개 주제 선택됨`}
        </p>
      </Card>

      <div className="sticky bottom-24 z-10">
        <Link
          href={href}
          className="flex min-h-14 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-ink shadow-lg active:opacity-85"
        >
          {goal.label} 시작하기
        </Link>
      </div>
    </>
  );
}
