import type { EngineConfig } from "@/core/engine/config";
import type { LearnerEvent, MemoEvent } from "@/core/learner/events";
import { emptyState, foldEvents, type LearnerState } from "@/core/learner/state";
import type { LocalEventStore } from "./event-store";
import { SyncService, type SyncGateway, type SyncState } from "./sync";

export interface LearnerSnapshot {
  ready: boolean;
  learnerId: string;
  state: LearnerState;
  sync: SyncState;
  pendingUploads: number;
}

const SYNC_DEBOUNCE_MS = 1500;

/**
 * UI가 바라보는 단일 학습자 저장소.
 * 기록은 항상 로컬에 먼저 쓰고(즉시 반영), 서버 동기화는 뒤에서 따라간다.
 */
export class LearnerStore {
  private snapshot: LearnerSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly sync: SyncService;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly events: LocalEventStore,
    gateway: SyncGateway,
    private readonly config: EngineConfig,
    private readonly clock: { now: () => number; newId: () => string },
  ) {
    this.sync = new SyncService(events, gateway, (s) => this.update({ sync: s }));
    this.snapshot = {
      ready: true,
      learnerId: events.learnerId,
      state: foldEvents(events.all(), config),
      sync: { kind: "unknown" },
      pendingUploads: events.pendingCount,
    };
  }

  static readonly serverSnapshot: LearnerSnapshot = {
    ready: false,
    learnerId: "",
    state: emptyState(),
    sync: { kind: "unknown" },
    pendingUploads: 0,
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): LearnerSnapshot => this.snapshot;

  record(events: readonly LearnerEvent[]): void {
    if (events.length === 0) return;
    this.events.append(events);
    this.refold();
    this.scheduleSync();
  }

  createMemo(text: string, sessionId: string | null): void {
    const at = new Date(this.clock.now()).toISOString();
    this.record([{ type: "memo", id: this.clock.newId(), text, sessionId, createdAt: at, updatedAt: at, deleted: false }]);
  }

  updateMemo(memo: MemoEvent, text: string): void {
    this.record([{ ...memo, text, updatedAt: new Date(this.clock.now()).toISOString() }]);
  }

  deleteMemo(memo: MemoEvent): void {
    this.record([{ ...memo, deleted: true, updatedAt: new Date(this.clock.now()).toISOString() }]);
  }

  async syncNow(): Promise<void> {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = null;
    const changed = await this.sync.run();
    if (changed) this.refold();
    else this.update({ pendingUploads: this.events.pendingCount });
  }

  /** 다른 기기의 동기화 코드로 전환 */
  async switchLearner(learnerId: string): Promise<void> {
    // 아직 서버에 안 올린 기록이 있으면 전환 시 사라지므로 막는다
    if (this.events.pendingCount > 0) throw new Error("동기화되지 않은 기록이 있어 전환할 수 없어요.");
    this.events.switchLearner(learnerId);
    this.update({ learnerId });
    this.refold();
    await this.syncNow();
  }

  private scheduleSync(): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => void this.syncNow(), SYNC_DEBOUNCE_MS);
  }

  private refold(): void {
    this.update({ state: foldEvents(this.events.all(), this.config), pendingUploads: this.events.pendingCount });
  }

  private update(patch: Partial<LearnerSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const l of this.listeners) l();
  }
}
