import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { SessionGoal } from "@/core/learner/events";

/**
 * 모든 이벤트 테이블이 공유하는 증가 번호. 클라이언트는 "마지막으로 받은 seq" 이후만 받아간다.
 * 학습자 단위 advisory lock 안에서만 쓰기 때문에 같은 학습자 안에서는 커밋 순서 = seq 순서가 보장된다.
 */
export const syncSeq = pgSequence("sync_seq");
const seqColumn = () =>
  bigint("seq", { mode: "number" })
    .notNull()
    .default(sql`nextval('sync_seq')`);

export const learners = pgTable("learners", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attempts = pgTable(
  "attempts",
  {
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    sessionId: text("session_id").notNull(),
    questionId: text("question_id").notNull(),
    topicId: text("topic_id").notNull(),
    difficulty: smallint("difficulty").notNull(),
    correct: boolean("correct").notNull(),
    hintsUsed: smallint("hints_used").notNull(),
    responseMs: integer("response_ms").notNull(),
    pace: text("pace").notNull(),
    at: timestamp("at", { withTimezone: true, mode: "string" }).notNull(),
    seq: seqColumn(),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.id] }), index("attempts_learner_seq").on(t.learnerId, t.seq)],
);

export const sessions = pgTable(
  "sessions",
  {
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    topicIds: text("topic_ids").array().notNull(),
    goal: jsonb("goal").$type<SessionGoal>().notNull(),
    answered: integer("answered").notNull(),
    correct: integer("correct").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "string" }).notNull(),
    seq: seqColumn(),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.id] }), index("sessions_learner_seq").on(t.learnerId, t.seq)],
);

export const memos = pgTable(
  "memos",
  {
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    text: text("text").notNull(),
    sessionId: text("session_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
    deleted: boolean("deleted").notNull().default(false),
    seq: seqColumn(),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.id] }), index("memos_learner_seq").on(t.learnerId, t.seq)],
);
