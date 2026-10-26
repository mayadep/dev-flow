"use client";

import { useState } from "react";
import { learnerIdSchema } from "@/core/sync/protocol";
import type { SyncState } from "@/storage/sync";
import { Button, Card, Loading, PageTitle } from "../components/primitives";
import { getLearnerStore } from "../learner/runtime";
import { useLearner } from "../learner/use-learner";

function describeSync(s: SyncState, pending: number): string {
  switch (s.kind) {
    case "unknown":
      return "확인 중…";
    case "local-only":
      return "이 기기에만 저장 중 (서버 DB 미연결)";
    case "syncing":
      return "동기화 중…";
    case "synced":
      return pending ? `서버 연결됨 · 올릴 기록 ${pending}개` : "서버와 동기화됨";
    case "error":
      return `동기화 실패: ${s.message} (기록은 이 기기에 안전하게 남아 있어)`;
  }
}

export function SettingsScreen() {
  const { ready, learnerId, sync, pendingUploads } = useLearner();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [switchArmed, setSwitchArmed] = useState(false);

  if (!ready) return <Loading />;

  const store = getLearnerStore();
  const validCode = learnerIdSchema.safeParse(code.trim()).success && code.trim() !== learnerId;
  const serverOn = sync.kind === "synced" || sync.kind === "syncing";

  return (
    <>
      <PageTitle>설정</PageTitle>

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">저장 상태</h2>
        <p className="mb-4 text-sm text-muted">{describeSync(sync, pendingUploads)}</p>
        <Button variant="secondary" className="w-full" onClick={() => void store.syncNow()}>
          지금 동기화
        </Button>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">내 동기화 코드</h2>
        <p className="mb-3 text-sm text-muted">
          다른 기기(폰·PC)에서 이 코드를 입력하면 같은 기록으로 이어서 공부할 수 있어. 비밀번호처럼 남에게 알려주지 마.
        </p>
        <code className="mb-3 block break-all rounded-xl bg-surface-2 p-3 font-mono text-sm">{learnerId}</code>
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await navigator.clipboard.writeText(learnerId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "복사됨" : "코드 복사"}
        </Button>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">다른 기기 기록 불러오기</h2>
        <p className="mb-3 text-sm text-muted">
          {serverOn
            ? "다른 기기의 동기화 코드를 넣으면 그 기록으로 바뀌어. 이 기기의 현재 기록은 서버에 남아 있으니 원래 코드로 언제든 돌아올 수 있어."
            : "서버 DB가 연결되어야 쓸 수 있어."}
        </p>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setSwitchArmed(false);
          }}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="mb-3 w-full rounded-xl border border-line bg-bg p-3 font-mono text-sm outline-none focus:border-accent"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button
          className="w-full"
          disabled={!validCode || !serverOn || pendingUploads > 0}
          onClick={async () => {
            if (!switchArmed) return setSwitchArmed(true);
            await store.switchLearner(code.trim());
            setCode("");
            setSwitchArmed(false);
          }}
        >
          {switchArmed ? "한 번 더 누르면 전환" : "이 코드로 전환"}
        </Button>
        {pendingUploads > 0 && serverOn && (
          <p className="mt-2 text-xs text-muted">아직 서버에 안 올라간 기록이 있어. 동기화가 끝난 뒤 전환할 수 있어.</p>
        )}
      </Card>
    </>
  );
}
