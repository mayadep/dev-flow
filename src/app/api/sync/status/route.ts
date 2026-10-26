import { connection } from "next/server";
import type { SyncStatus } from "@/core/sync/protocol";
import { getSyncRepository } from "@/server/sync/provider";

export async function GET() {
  // 배포 환경변수에 따라 달라지므로 요청 시점에 판단한다
  await connection();
  return Response.json({ enabled: getSyncRepository() !== null } satisfies SyncStatus, {
    headers: { "cache-control": "no-store" },
  });
}
