import { MAX_PUSH_BATCH, syncRequestSchema, type SyncResponse } from "@/core/sync/protocol";
import { getSyncRepository } from "@/server/sync/provider";

const PULL_LIMIT = MAX_PUSH_BATCH;

export async function POST(request: Request) {
  const repo = getSyncRepository();
  if (!repo) return Response.json({ error: "sync-disabled" }, { status: 503 });

  const body = syncRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "invalid-request", issues: body.error.issues.slice(0, 5) }, { status: 400 });
  }

  const { learnerId, cursor, events } = body.data;
  const result = await repo.pushAndPull(learnerId, events, cursor, PULL_LIMIT);
  return Response.json(result satisfies SyncResponse);
}
