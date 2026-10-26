import { newerOf, type LearnerEvent } from "@/core/learner/events";
import type { KeyValueStore } from "./kv";

const KEYS = {
  events: "events",
  outbox: "outbox",
  cursor: "cursor",
  learnerId: "learnerId",
} as const;

/**
 * 기기 로컬 이벤트 로그 + 아직 서버로 안 보낸 이벤트(outbox) + 서버 커서.
 * 오프라인이어도 모든 기록은 여기 먼저 남고, 동기화는 나중에 따라온다.
 */
export class LocalEventStore {
  private events: Map<string, LearnerEvent>;
  private outbox: Set<string>;

  constructor(
    private readonly kv: KeyValueStore,
    private readonly newId: () => string,
  ) {
    this.events = new Map((kv.get<LearnerEvent[]>(KEYS.events) ?? []).map((e) => [e.id, e]));
    this.outbox = new Set(kv.get<string[]>(KEYS.outbox) ?? []);
  }

  get learnerId(): string {
    let id = this.kv.get<string>(KEYS.learnerId);
    if (!id) {
      id = this.newId();
      this.kv.set(KEYS.learnerId, id);
    }
    return id;
  }

  get cursor(): number {
    return this.kv.get<number>(KEYS.cursor) ?? 0;
  }

  set cursor(value: number) {
    this.kv.set(KEYS.cursor, value);
  }

  all(): LearnerEvent[] {
    return [...this.events.values()];
  }

  /** 이 기기에서 새로 생긴 이벤트: 저장 + 업로드 대기열에 추가 */
  append(events: readonly LearnerEvent[]): void {
    if (events.length === 0) return;
    for (const e of events) {
      const prev = this.events.get(e.id);
      this.events.set(e.id, prev ? newerOf(prev, e) : e);
      this.outbox.add(e.id);
    }
    this.persist();
  }

  /** 서버에서 받은 이벤트 병합. 바뀐 게 있으면 true */
  merge(events: readonly LearnerEvent[]): boolean {
    let changed = false;
    for (const e of events) {
      const prev = this.events.get(e.id);
      const next = prev ? newerOf(prev, e) : e;
      if (next !== prev) {
        this.events.set(e.id, next);
        changed = true;
      }
    }
    if (changed) this.persist();
    return changed;
  }

  pending(limit: number): LearnerEvent[] {
    const out: LearnerEvent[] = [];
    for (const id of this.outbox) {
      const e = this.events.get(id);
      if (e) out.push(e);
      if (out.length >= limit) break;
    }
    return out;
  }

  get pendingCount(): number {
    return this.outbox.size;
  }

  /** 올린 그 버전 그대로일 때만 대기열에서 뺀다(업로드 중 수정된 메모는 다음에 다시 올림) */
  markSynced(sent: readonly LearnerEvent[]): void {
    for (const e of sent) {
      if (this.events.get(e.id) === e) this.outbox.delete(e.id);
    }
    this.kv.set(KEYS.outbox, [...this.outbox]);
  }

  /** 다른 기기의 동기화 코드로 갈아타기: 로컬 기록을 비우고 서버에서 다시 받는다 */
  switchLearner(learnerId: string): void {
    this.events.clear();
    this.outbox.clear();
    this.kv.set(KEYS.learnerId, learnerId);
    this.cursor = 0;
    this.persist();
  }

  private persist(): void {
    this.kv.set(KEYS.events, [...this.events.values()]);
    this.kv.set(KEYS.outbox, [...this.outbox]);
  }
}
