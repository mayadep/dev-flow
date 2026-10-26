import "server-only";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { AttemptEvent, LearnerEvent, MemoEvent, SessionEvent } from "@/core/learner/events";
import type { Database } from "../db/client";
import { attempts, learners, memos, sessions } from "../db/schema";

export interface PullResult {
  events: LearnerEvent[];
  cursor: number;
  hasMore: boolean;
}

/** 서버 측 이벤트 저장소 포트. API 라우트는 이 인터페이스만 안다. */
export interface SyncRepository {
  pushAndPull(learnerId: string, events: readonly LearnerEvent[], cursor: number, limit: number): Promise<PullResult>;
}

type Seq<T> = T & { seq: number };

export class DrizzleSyncRepository implements SyncRepository {
  constructor(private readonly db: Database) {}

  async pushAndPull(
    learnerId: string,
    events: readonly LearnerEvent[],
    cursor: number,
    limit: number,
  ): Promise<PullResult> {
    const db = this.db;
    const attemptRows = events.filter((e): e is AttemptEvent => e.type === "attempt");
    const sessionRows = events.filter((e): e is SessionEvent => e.type === "session");
    const memoRows = events.filter((e): e is MemoEvent => e.type === "memo");

    const writes = [
      ...(attemptRows.length
        ? [
            db
              .insert(attempts)
              .values(attemptRows.map(({ type: _type, ...a }) => ({ ...a, learnerId })))
              .onConflictDoNothing(),
          ]
        : []),
      ...(sessionRows.length
        ? [
            db
              .insert(sessions)
              .values(sessionRows.map(({ type: _type, ...s }) => ({ ...s, learnerId })))
              .onConflictDoNothing(),
          ]
        : []),
      ...(memoRows.length
        ? [
            db
              .insert(memos)
              .values(memoRows.map(({ type: _type, ...m }) => ({ ...m, learnerId })))
              .onConflictDoUpdate({
                target: [memos.learnerId, memos.id],
                set: {
                  text: sql`excluded.text`,
                  deleted: sql`excluded.deleted`,
                  updatedAt: sql`excluded.updated_at`,
                  seq: sql`nextval('sync_seq')`,
                },
                setWhere: sql`excluded.updated_at > ${memos.updatedAt}`,
              }),
          ]
        : []),
    ];

    // 한 번의 HTTP 왕복 = 한 트랜잭션. 학습자별 잠금으로 seq 순서와 커밋 순서를 일치시킨다.
    const [, , ...rest] = await db.batch([
      db.execute(sql`select pg_advisory_xact_lock(hashtext(${learnerId}))`),
      db
        .insert(learners)
        .values({ id: learnerId })
        .onConflictDoUpdate({ target: learners.id, set: { lastSeenAt: sql`now()` } }),
      ...writes,
      db
        .select()
        .from(attempts)
        .where(and(eq(attempts.learnerId, learnerId), gt(attempts.seq, cursor)))
        .orderBy(asc(attempts.seq))
        .limit(limit + 1),
      db
        .select()
        .from(sessions)
        .where(and(eq(sessions.learnerId, learnerId), gt(sessions.seq, cursor)))
        .orderBy(asc(sessions.seq))
        .limit(limit + 1),
      db
        .select()
        .from(memos)
        .where(and(eq(memos.learnerId, learnerId), gt(memos.seq, cursor)))
        .orderBy(asc(memos.seq))
        .limit(limit + 1),
    ] as const);

    const [attemptOut, sessionOut, memoOut] = rest.slice(writes.length) as [
      (typeof attempts.$inferSelect)[],
      (typeof sessions.$inferSelect)[],
      (typeof memos.$inferSelect)[],
    ];

    const merged: Seq<LearnerEvent>[] = [
      ...attemptOut.map(
        (r): Seq<AttemptEvent> => ({
          type: "attempt",
          id: r.id,
          sessionId: r.sessionId,
          questionId: r.questionId,
          topicId: r.topicId,
          difficulty: r.difficulty as AttemptEvent["difficulty"],
          correct: r.correct,
          hintsUsed: r.hintsUsed,
          responseMs: r.responseMs,
          pace: r.pace as AttemptEvent["pace"],
          at: toIso(r.at),
          seq: r.seq,
        }),
      ),
      ...sessionOut.map(
        (r): Seq<SessionEvent> => ({
          type: "session",
          id: r.id,
          topicIds: r.topicIds,
          goal: r.goal,
          answered: r.answered,
          correct: r.correct,
          startedAt: toIso(r.startedAt),
          endedAt: toIso(r.endedAt),
          seq: r.seq,
        }),
      ),
      ...memoOut.map(
        (r): Seq<MemoEvent> => ({
          type: "memo",
          id: r.id,
          text: r.text,
          sessionId: r.sessionId,
          createdAt: toIso(r.createdAt),
          updatedAt: toIso(r.updatedAt),
          deleted: r.deleted,
          seq: r.seq,
        }),
      ),
    ].sort((a, b) => a.seq - b.seq);

    const page = merged.slice(0, limit);
    return {
      events: page.map(({ seq: _seq, ...e }) => e as LearnerEvent),
      cursor: page.length ? page[page.length - 1].seq : cursor,
      hasMore: merged.length > limit,
    };
  }
}

/** Postgres timestamptz 문자열을 클라이언트와 같은 ISO 형식으로 통일 */
function toIso(value: string): string {
  return new Date(value).toISOString();
}
