import { describe, expect, it } from "vitest";
import type { LearnerEvent, MemoEvent } from "@/core/learner/events";
import { learnerEventSchema, type SyncRequest, type SyncResponse } from "@/core/sync/protocol";
import { LocalEventStore } from "@/storage/event-store";
import { MemoryKV } from "@/storage/kv";
import { SyncService, type SyncGateway } from "@/storage/sync";

/** 서버 동작을 흉내 내는 인메모리 게이트웨이(학습자별 로그 + 전역 seq) */
class FakeServer implements SyncGateway {
  private seq = 0;
  readonly rows = new Map<string, { event: LearnerEvent; seq: number }[]>();
  constructor(private readonly enabled = true) {}

  async status() {
    return { enabled: this.enabled };
  }

  async sync(req: SyncRequest): Promise<SyncResponse> {
    const log = this.rows.get(req.learnerId) ?? [];
    for (const e of req.events) {
      learnerEventSchema.parse(e);
      const existing = log.find((r) => r.event.id === e.id);
      if (!existing) log.push({ event: e, seq: ++this.seq });
      else if (e.type === "memo" && existing.event.type === "memo" && e.updatedAt > existing.event.updatedAt) {
        existing.event = e;
        existing.seq = ++this.seq;
      }
    }
    this.rows.set(req.learnerId, log);
    const out = log.filter((r) => r.seq > req.cursor).sort((a, b) => a.seq - b.seq);
    return { events: out.map((r) => r.event), cursor: out.at(-1)?.seq ?? req.cursor, hasMore: false };
  }
}

let ids = 0;
const newId = () => `00000000-0000-4000-8000-${String(++ids).padStart(12, "0")}`;

const memo = (id: string, text: string, updatedAt: string): MemoEvent => ({
  type: "memo",
  id,
  text,
  sessionId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt,
  deleted: false,
});

describe("로컬 저장 + 서버 동기화", () => {
  it("DB가 없으면 로컬 전용으로 동작한다", async () => {
    const store = new LocalEventStore(new MemoryKV(), newId);
    const states: string[] = [];
    store.append([memo("m1", "hi", "2026-01-01T00:00:00.000Z")]);
    await new SyncService(store, new FakeServer(false), (s) => states.push(s.kind)).run();
    expect(states).toEqual(["local-only"]);
    expect(store.pendingCount).toBe(1);
  });

  it("두 기기가 같은 동기화 코드로 기록을 공유한다", async () => {
    const server = new FakeServer();
    const a = new LocalEventStore(new MemoryKV(), newId);
    const b = new LocalEventStore(new MemoryKV(), newId);
    b.switchLearner(a.learnerId);

    a.append([memo("m1", "기기 A", "2026-01-01T00:00:00.000Z")]);
    await new SyncService(a, server, () => {}).run();
    expect(a.pendingCount).toBe(0);

    await new SyncService(b, server, () => {}).run();
    expect(b.all().map((e) => e.id)).toEqual(["m1"]);

    // B에서 메모 수정 → A가 최신 버전을 받는다(LWW)
    b.append([memo("m1", "기기 B에서 수정", "2026-01-02T00:00:00.000Z")]);
    await new SyncService(b, server, () => {}).run();
    await new SyncService(a, server, () => {}).run();
    expect((a.all()[0] as MemoEvent).text).toBe("기기 B에서 수정");
  });

  it("오래된 메모 버전은 최신 버전을 덮어쓰지 않는다", () => {
    const store = new LocalEventStore(new MemoryKV(), newId);
    store.append([memo("m1", "new", "2026-01-02T00:00:00.000Z")]);
    store.merge([memo("m1", "old", "2026-01-01T00:00:00.000Z")]);
    expect((store.all()[0] as MemoEvent).text).toBe("new");
  });

  it("로컬 저장소는 다시 열어도 이벤트와 대기열을 유지한다", () => {
    const kv = new MemoryKV();
    const s1 = new LocalEventStore(kv, newId);
    const id = s1.learnerId;
    s1.append([memo("m1", "x", "2026-01-01T00:00:00.000Z")]);
    const s2 = new LocalEventStore(kv, newId);
    expect(s2.learnerId).toBe(id);
    expect(s2.pendingCount).toBe(1);
    expect(s2.all()).toHaveLength(1);
  });
});
