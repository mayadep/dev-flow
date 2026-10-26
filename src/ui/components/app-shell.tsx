"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBackgroundSync } from "../learner/use-learner";

const tabs = [
  { href: "/", label: "홈", icon: "◎" },
  { href: "/stats", label: "기록", icon: "▤" },
  { href: "/notes", label: "메모", icon: "✎" },
  { href: "/settings", label: "설정", icon: "⚙" },
] as const;

/** 공통 레이아웃: 모바일 폭 컨테이너 + 하단 탭. 학습 세션 중에는 탭을 숨겨 몰입을 돕는다. */
export function AppShell({ children }: { children: React.ReactNode }) {
  useBackgroundSync();
  const pathname = usePathname();
  const focusMode = pathname.startsWith("/learn");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className={`flex-1 px-4 pt-[max(env(safe-area-inset-top),16px)] ${focusMode ? "pb-6" : "pb-28"}`}>
        {children}
      </main>
      {!focusMode && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto grid max-w-md grid-cols-4">
            {tabs.map((t) => {
              const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className={`flex flex-col items-center gap-0.5 py-2.5 text-xs ${active ? "text-accent font-semibold" : "text-muted"}`}
                  >
                    <span aria-hidden className="text-lg leading-none">
                      {t.icon}
                    </span>
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
