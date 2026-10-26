import "server-only";
import { getDb } from "../db/client";
import { DrizzleSyncRepository, type SyncRepository } from "./repository";

/** 설정된 저장소를 고른다. DB가 없으면 null(=서버 동기화 꺼짐). */
export function getSyncRepository(): SyncRepository | null {
  const db = getDb();
  return db ? new DrizzleSyncRepository(db) : null;
}
