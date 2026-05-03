# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## コマンド

```bash
npm run dev                        # 開発サーバー起動
npm run build                      # プロダクションビルド (.next/standalone を生成)
npm run start                      # .next/standalone/server.js を Node 実行
npm run lint                       # 型チェック (tsc --noEmit)。ESLint は導入されていない
npm run typecheck                  # lint と同じ (tsc --noEmit)
npm run firebase:login             # Firebase CLI ログイン
npm run firebase:use               # Firebase プロジェクト切り替え
npm run firebase:deploy:firestore  # firestore.rules をデプロイ
```

テストランナーは未導入。「テストを実行」と言われた場合は `npm run lint` (型チェック) と `npm run build` を案内する。

Docker:
```bash
docker build -t personal-project-manager .
docker run --rm -p 3000:3000 --env-file .env.local personal-project-manager
docker compose up --build
```

Kubernetes:
```bash
kubectl apply -f k8s/secret.example.yaml   # 実値で置換してから apply
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## 環境変数

`.env.example` を `.env.local` にコピーして埋める。

### Firebase (必須: 欠けると認証と Firestore が無効化される)

```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

### AI (任意: 欠けると AI ボタンだけが無効化される)

```
AI_PROVIDER=gemini
GEMINI_MODEL                 # 例: gemini-2.0-flash
GEMINI_API_KEY
AI_REQUEST_TIMEOUT_MS        # 省略時 30000
AI_MAX_INPUT_TASKS           # 省略時 100
```

`.env.local` の値が揃っていなくてもアプリは起動する。Firebase 未設定ならセットアップ案内画面が出て他機能は待機、AI 未設定なら AI ボタンだけ無効。

## アーキテクチャ

**技術スタック:** Next.js 16 App Router (`output: "standalone"`) / React 19 / TypeScript / Tailwind CSS 4 / Firebase Authentication (Google) / Cloud Firestore / Google Gemini API (任意)

### Firebase 設定の注入フロー

`lib/firebase/runtime-config.ts` がサーバー側で環境変数を読み、`FirebaseWebConfig | null` を返す。
`app/layout.tsx` (Server Component) がこれを呼び出し、クライアントの `<Providers>` に props として渡す。
環境変数が 1 つでも欠けると `null` が渡り、アプリは「未設定」状態で動作する (`isConfigured: false`)。

### 認証・Firebase インスタンス管理

`app/providers.tsx` がアプリ全体の `AuthContext` を保持する。
Firebase の `auth` / `firestore` インスタンスも同じ context で配布されるため、各画面は `useAuth()` フックから取得する。
Context は `user / loading / auth / firestore / isConfigured / isAiConfigured / signInWithGoogle / signOutUser` を提供する。
Firebase SDK の初期化は `lib/firebase/client.ts` の `getFirebaseServices()` が config をキーにキャッシュして管理する。

### データアクセス層

```
lib/
  firebase/
    runtime-config.ts   # 環境変数 → FirebaseWebConfig | null
    client.ts           # クライアント SDK 初期化キャッシュ
    admin.ts            # Firebase ID Token 検証 (Node 標準 crypto のみ。外部 SDK 非依存)
  firestore/
    mappers.ts          # Firestore DocumentSnapshot → 型付きオブジェクト変換
  repositories/
    projects.ts         # projects コレクションの CRUD + リアルタイム購読
    tasks.ts            # projects/{id}/tasks サブコレクションの CRUD + リアルタイム購読
```

Repository 関数は `Firestore` インスタンスを第一引数に取る。リアルタイム購読は `onSnapshot` を使い `Unsubscribe` を返す。
Project 削除時は Firestore がサブコレクションを自動削除しないため、`deleteProject` が先に tasks を手動削除する。

### Firestore セキュリティルール

`firestore.rules` で `ownerUid` ベースのアクセス制御を行う。

- `projects/{id}`: 作成時に `request.resource.data.ownerUid == request.auth.uid`、それ以外は所有者のみ。`update` 時は `ownerUid` の改竄を禁止
- `projects/{id}/tasks/{taskId}`: 親プロジェクトの所有者のみ CRUD 可能 (`get` で親を辿って判定)

ルールを変更したら `npm run firebase:deploy:firestore` で反映する (`.firebaserc` が必要)。

### AI 連携 (任意機能)

`lib/ai/runtime-config.ts` が `AI_PROVIDER` / `GEMINI_API_KEY` / `GEMINI_MODEL` の有無を見て有効/無効を切り替える。

```
lib/ai/
  runtime-config.ts   # AI 設定の読み取りと isAiConfigured 判定
  provider.ts         # プロバイダ抽象 (現状は gemini のみ)
  gemini.ts           # Gemini REST 呼び出し実装
  prompts.ts          # 各タスクのプロンプト生成
  schemas.ts          # 入出力バリデーション
  errors.ts           # AI 例外型
  auth.ts             # Route Handler 用の ID Token 検証ヘルパー (lib/firebase/admin.ts と連携)

app/api/ai/
  summarize-project/route.ts
  suggest-next-actions/route.ts
  draft-task/route.ts
```

Route Handler は **Firebase ID Token の検証を必須** とする。クライアントは `Authorization: Bearer <idToken>` を添付し、サーバー側は `lib/firebase/admin.ts` が Google の X.509 公開証明書で JWT を検証する (Project ID は既存の `FIREBASE_PROJECT_ID` を流用、追加の admin キーは不要)。

エラー応答:

| Status | 原因 |
| --- | --- |
| 400 | リクエストボディ不正 |
| 401 | Authorization ヘッダ欠落 / Token 不正・期限切れ・署名不一致 |
| 502 | Gemini API 通信失敗・タイムアウト |
| 503 | AI 設定未完了、または `FIREBASE_PROJECT_ID` 未設定 |

`docs/ai/` 配下に Gemma ローカル LLM 時代の歴史的メモが残るが、現行は Gemini が正系。

### 画面構成

```
app/
  layout.tsx                   # Firebase 設定読み込み・Providers 注入
  providers.tsx                # AuthContext
  page.tsx                     # "/" → "/projects" リダイレクト
  login/page.tsx               # 未認証時のランディング
  projects/
    page.tsx                   # Project 一覧
    [projectId]/page.tsx       # Project 詳細 (Task 一覧 + Task 詳細パネル)
  api/ai/{...}/route.ts        # AI Route Handler (上記)
  healthz/route.ts             # Kubernetes liveness/readiness 用ヘルスチェック
```

共有 UI コンポーネントは `components/` に配置。

### 型定義

`types/index.ts` に `Project`, `Task`, `TaskStatus`, `TaskPriority`, `TaskInput`, `ProjectInput`, `TaskFilters` をまとめて定義。
ステータス・優先度のラベル定数 (`TASK_STATUS_OPTIONS`, `TASK_PRIORITY_OPTIONS`) も同ファイルに置く。

## 役割分担 (docs/dev-workflow.md より)

- **Claude Code**: 要件整理・実装順分解・レビュー・仕様言語化
- **Codex**: 機能実装・型整理・リファクタ・テスト・ビルド修正
- **Gemini**: docs 文書・低リスク UI 文言修正・小さく閉じた実装

Firestore データモデル変更・認証まわり・Docker / Kubernetes 本番設定・複数ファイルにまたがる状態管理変更は Gemini に任せない。
