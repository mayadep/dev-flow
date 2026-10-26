import { MAX_PUSH_BATCH, type SyncRequest, type SyncResponse, type SyncStatus } from "@/core/sync/protocol";
import type { LocalEventStore } from "./event-store";

/** 서버와 통신하는 부분만 분리한 포트. 테스트에서는 가짜 구현을 끼운다. */
export interface SyncGateway {
  status(): Promise<SyncStatus>;
  sync(request: SyncRequest): Promise<SyncResponse>;
}

export class HttpSyncGateway implements SyncGateway {
  constructor(private readonly baseUrl = "") {}

  async status(): Promise<SyncStatus> {
    const res = await fetch(`${this.baseUrl}/api/sync/status`, { cache: "no-store" });
    if (!res.ok) return { enabled: false };
    return (await res.json()) as SyncStatus;
  }

  async sync(request: SyncRequest): Promise<SyncResponse> {
    const res = await fetch(`${this.baseUrl}/api/sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`동기화 실패 (${res.status})`);
    return (await res.json()) as SyncResponse;
  }
}

export type SyncState =
  | { kind: "unknown" }
  | { kind: "local-only" }
  | { kind: "syncing" }
  | { kind: "synced"; at: string }
  | { kind: "error"; message: string };

/**
 * outbox를 올리고 서버의 새 이벤트를 받아오는 한 사이클.
 * 서버 DB가 없으면(local-only) 아무 것도 하지 않고 로컬 저장만으로 동작한다.
 */
export class SyncService {
  private enabled: boolean | null = null;
  private running: Promise<boolean> | null = null;

  constructor(
    private readonly store: LocalEventStore,
    private readonly gateway: SyncGateway,
    private readonly onState: (s: SyncState) => void,
  ) {}

  /** 원격 이벤트로 로컬이 바뀌었으면 true. 동시에 여러 번 불려도 한 번만 돈다. */
  run(): Promise<boolean> {
    this.running ??= this.cycle().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async cycle(): Promise<boolean> {
    try {
      if (this.enabled === null) this.enabled = (await this.gateway.status()).enabled;
      if (!this.enabled) {
        this.onState({ kind: "local-only" });
        return false;
      }
      this.onState({ kind: "syncing" });
      let changed = false;
      for (let round = 0; round < 50; round++) {
        const pushing = this.store.pending(MAX_PUSH_BATCH);
        const res = await this.gateway.sync({
          learnerId: this.store.learnerId,
          cursor: this.store.cursor,
          events: pushing,
        });
        this.store.markSynced(pushing);
        changed = this.store.merge(res.events) || changed;
        this.store.cursor = res.cursor;
        if (!res.hasMore && this.store.pendingCount === 0) break;
      }
      this.onState({ kind: "synced", at: new Date().toISOString() });
      return changed;
    } catch (err) {
      // status 조회 자체가 실패했다면 enabled는 null로 남아 다음 사이클에서 다시 묻는다
      this.onState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }
}
