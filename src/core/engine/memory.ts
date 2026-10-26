/**
 * 문제별 기억 상태(라이트너 상자). 틀린 문제는 곧 다시 나오고, 잘 아는 문제는 점점 뜸해진다.
 */
export interface QuestionMemory {
  questionId: string;
  box: number;
  seen: number;
  correct: number;
  lastSeenAt: string;
  dueAt: string;
}

/** 상자 번호별 다음 복습까지 간격(ms) */
export const BOX_INTERVALS_MS = [
  10 * 60_000, // 틀림: 10분 뒤
  24 * 3600_000,
  3 * 24 * 3600_000,
  7 * 24 * 3600_000,
  16 * 24 * 3600_000,
  35 * 24 * 3600_000,
];

export function applyToMemory(
  prev: QuestionMemory | undefined,
  questionId: string,
  correct: boolean,
  hintsUsed: number,
  at: string,
): QuestionMemory {
  const prevBox = prev?.box ?? 0;
  // 힌트를 보고 맞힌 건 제자리, 틀리면 처음으로
  const box = !correct ? 0 : hintsUsed > 0 ? Math.max(1, prevBox) : Math.min(prevBox + 1, BOX_INTERVALS_MS.length - 1);
  const dueAt = new Date(Date.parse(at) + BOX_INTERVALS_MS[box]).toISOString();
  return {
    questionId,
    box,
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    lastSeenAt: at,
    dueAt,
  };
}

export function isDue(memory: QuestionMemory, now: number): boolean {
  return Date.parse(memory.dueAt) <= now;
}
