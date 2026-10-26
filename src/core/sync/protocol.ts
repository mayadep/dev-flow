import { z } from "zod";
import type { LearnerEvent } from "../learner/events";

/** 클라이언트와 서버가 공유하는 동기화 프로토콜. 서버는 이 스키마로 입력을 검증한다. */

const iso = z.iso.datetime({ offset: true });
const id = z.string().min(1).max(64);

const goalSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("questions"), count: z.number().int().min(1).max(200) }),
  z.object({ kind: z.literal("minutes"), minutes: z.number().int().min(1).max(240) }),
]);

export const attemptEventSchema = z.object({
  type: z.literal("attempt"),
  id,
  sessionId: id,
  questionId: id,
  topicId: id,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  correct: z.boolean(),
  hintsUsed: z.number().int().min(0).max(20),
  responseMs: z.number().int().min(0).max(24 * 3600_000),
  pace: z.enum(["fast", "normal", "slow"]),
  at: iso,
});

export const sessionEventSchema = z.object({
  type: z.literal("session"),
  id,
  topicIds: z.array(id).max(100),
  goal: goalSchema,
  answered: z.number().int().min(0),
  correct: z.number().int().min(0),
  startedAt: iso,
  endedAt: iso,
});

export const memoEventSchema = z.object({
  type: z.literal("memo"),
  id,
  text: z.string().max(5000),
  sessionId: id.nullable(),
  createdAt: iso,
  updatedAt: iso,
  deleted: z.boolean(),
});

export const learnerEventSchema = z.discriminatedUnion("type", [
  attemptEventSchema,
  sessionEventSchema,
  memoEventSchema,
]);

/** 기기 간 동기화 코드 = 학습자 id */
export const learnerIdSchema = z.uuid();

export const MAX_PUSH_BATCH = 500;

export const syncRequestSchema = z.object({
  learnerId: learnerIdSchema,
  /** 마지막으로 받은 서버 커서(처음이면 0) */
  cursor: z.number().int().min(0),
  events: z.array(learnerEventSchema).max(MAX_PUSH_BATCH),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;

export interface SyncResponse {
  cursor: number;
  events: LearnerEvent[];
  /** 한 번에 다 못 보냈으면 true: 클라이언트가 이어서 다시 요청한다 */
  hasMore: boolean;
}

export interface SyncStatus {
  enabled: boolean;
}

// 스키마와 도메인 타입이 어긋나면 컴파일 에러가 나도록 묶어 둔다.
type Assert<T extends true> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type _EventSchemaMatchesDomain = Assert<Same<z.infer<typeof learnerEventSchema>, LearnerEvent>>;
