import { defaultEngineConfig } from "@/core/engine/config";
import { LocalEventStore } from "@/storage/event-store";
import { createBrowserKV, type KeyValueStore } from "@/storage/kv";
import { LearnerStore } from "@/storage/learner-store";
import { HttpSyncGateway } from "@/storage/sync";

/**
 * 브라우저 런타임 조립 지점(composition root).
 * 저장소·게이트웨이·설정을 바꾸려면 여기만 고치면 된다.
 */
export const engineConfig = defaultEngineConfig;

export const clock = {
  now: () => Date.now(),
  random: () => Math.random(),
  newId: () => crypto.randomUUID(),
};

let store: LearnerStore | null = null;
let prefsKV: KeyValueStore | null = null;

export function getLearnerStore(): LearnerStore {
  store ??= new LearnerStore(
    new LocalEventStore(createBrowserKV("devflow:v1"), clock.newId),
    new HttpSyncGateway(),
    engineConfig,
    clock,
  );
  return store;
}

/** 화면 설정 등 동기화하지 않는 기기 전용 값 */
export function getPrefs(): KeyValueStore {
  prefsKV ??= createBrowserKV("devflow:prefs");
  return prefsKV;
}
