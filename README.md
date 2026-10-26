# dev flow

심심할 때 스마트폰 브라우저로 열어서 짧게 몰입하는 개발 기본기 학습 웹앱.

- **적응형 난이도**: 주제별 실력 레벨(1~5)을 두고, 최근 정답률이 70~85%(경험칙)에 머물도록 다음 문제 난이도를 자동 조절
- **세션 단위 학습**: 5/10/15문제 또는 5/10분 목표, 문제마다 즉시 피드백·해설
- **막힘/지루함 감지**: 오래 걸리면 힌트를 권하고, 빠르게 연속 정답이면 난이도를 바로 올림
- **이완·메모 단계**: 세션 후 1/3/5분 멍때리기 타이머 → 떠오른 생각 메모
- **복습**: 틀린 문제는 라이트너 상자 방식으로 다시 등장
- **저장**: 기기 로컬(localStorage)에 먼저 저장, Neon DB가 연결되어 있으면 자동 동기화. 설정의 "동기화 코드"로 여러 기기에서 이어서 학습

## 학습 범위 (콘텐츠 팩 `software-essentials`)

Git · HTTP/웹 · DB/SQL · 자료구조/알고리즘 · 배포/인프라 · 보안 · 테스트 · 설계/아키텍처 — 8개 주제, 각 주제 난이도 1~5 문제.

## 구조

```
src/
  core/                 프레임워크 독립 도메인 로직 (순수 함수, 테스트 대상)
    content/            콘텐츠 팩 스키마, 카탈로그, 문제 유형별 채점/배치
    engine/             난이도(skill), 속도 판정(pace), 복습(memory), 문제 선택(selector)
    learner/            이벤트 정의와 이벤트 → 학습자 상태 계산(fold)
    session/            세션 상태 머신 (question → feedback → summary → relax → memo)
    sync/               클라이언트·서버 공유 동기화 프로토콜(zod)
  content/packs/        실제 문제들. 새 팩은 src/content/index.ts 에 등록
  storage/              기기 로컬 이벤트 저장소, outbox, 서버 동기화, UI용 스토어
  server/               Neon(Drizzle) 스키마와 동기화 저장소
  app/                  Next.js 라우트 (화면은 얇게, 로직은 ui/·core/에)
  ui/                   화면 컴포넌트와 훅
```

학습 기록은 **이벤트 로그**(풀이·세션·메모)로 저장하고, 실력 레벨은 로그를 접어서 계산한다. 그래서 어느 기기든 같은 로그면 같은 상태가 나오고, 오프라인에서 쌓인 기록도 나중에 그대로 합쳐진다.

### 확장 포인트

| 하고 싶은 것 | 고칠 곳 |
| --- | --- |
| 새 주제/팩 추가 | `src/content/packs/…` 작성 후 `src/content/index.ts`에 등록 |
| 새 문제 유형(예: 순서 맞추기) | `core/content/types.ts` 타입, `core/content/kinds.ts` 채점·배치, `ui/session/question-views.tsx` 렌더러 |
| 목표 정답률·조절 폭 | `core/engine/config.ts` |
| 로컬 저장을 IndexedDB로 | `storage/kv.ts`의 `KeyValueStore` 구현 추가 후 `ui/learner/runtime.ts`에서 교체 |
| 서버 저장소 교체 | `server/sync/repository.ts`의 `SyncRepository` 구현 |

## 개발

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 엔진·세션·동기화·콘텐츠 무결성 테스트
npm run lint
```

DB 없이도 그대로 동작한다(기기 로컬 저장 모드). DB를 붙이려면 `.env`에 `DATABASE_URL`을 넣고 `npm run db:migrate`.

스키마를 바꾸면 `npm run db:generate`로 `drizzle/`에 마이그레이션을 만들어 커밋한다. 배포 빌드(`npm run build`)가 시작 전에 마이그레이션을 적용한다.

## 배포 (Vercel + Neon)

1. Vercel에서 이 저장소를 Import → 그대로 Deploy (DB 없이도 동작)
2. Vercel 프로젝트 → Storage → Neon(Postgres) 생성/연결 → `DATABASE_URL`이 자동 등록됨
3. Redeploy → 빌드 중 테이블이 자동 생성되고, 앱 설정 화면에 "서버와 동기화됨"이 표시됨
