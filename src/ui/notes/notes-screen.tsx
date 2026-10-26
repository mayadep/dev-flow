"use client";

import { useState } from "react";
import type { MemoEvent } from "@/core/learner/events";
import { Button, Card, Loading, PageTitle } from "../components/primitives";
import { getLearnerStore } from "../learner/runtime";
import { useLearner } from "../learner/use-learner";

export function NotesScreen() {
  const { ready, state } = useLearner();
  const [draft, setDraft] = useState("");

  if (!ready) return <Loading />;

  const add = () => {
    if (!draft.trim()) return;
    getLearnerStore().createMemo(draft.trim(), null);
    setDraft("");
  };

  return (
    <>
      <PageTitle sub="쉬는 동안 떠오른 생각들">메모</PageTitle>

      <Card className="mb-5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="지금 떠오른 아이디어"
          className="mb-3 w-full rounded-2xl border border-line bg-bg p-3 text-base outline-none focus:border-accent"
        />
        <Button className="w-full" onClick={add} disabled={!draft.trim()}>
          적어 두기
        </Button>
      </Card>

      {state.memos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">아직 메모가 없어. 세션 끝나고 쉬는 동안 떠오른 걸 적어 봐.</p>
      ) : (
        <ul className="space-y-3">
          {state.memos.map((m) => (
            <MemoItem key={m.id} memo={m} />
          ))}
        </ul>
      )}
    </>
  );
}

function MemoItem({ memo }: { memo: MemoEvent }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(memo.text);
  const store = getLearnerStore();

  return (
    <li>
      <Card className="!p-4">
        <p className="mb-2 text-xs text-muted">
          {new Date(memo.createdAt).toLocaleString("ko-KR", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {memo.sessionId && " · 세션 중"}
        </p>
        {editing ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="mb-3 w-full rounded-xl border border-line bg-bg p-3 text-base outline-none focus:border-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setText(memo.text);
                  setEditing(false);
                }}
              >
                취소
              </Button>
              <Button
                disabled={!text.trim()}
                onClick={() => {
                  store.updateMemo(memo, text.trim());
                  setEditing(false);
                }}
              >
                저장
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{memo.text}</p>
            <div className="mt-2 flex justify-end gap-1">
              <Button variant="ghost" className="!min-h-9 !px-3 text-sm" onClick={() => setEditing(true)}>
                수정
              </Button>
              <DeleteButton onConfirm={() => store.deleteMemo(memo)} />
            </div>
          </>
        )}
      </Card>
    </li>
  );
}

/** 브라우저 confirm 대신 두 번 눌러 삭제 */
function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      variant="ghost"
      className={`!min-h-9 !px-3 text-sm ${armed ? "!text-bad" : ""}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
    >
      {armed ? "한 번 더 누르면 삭제" : "삭제"}
    </Button>
  );
}
