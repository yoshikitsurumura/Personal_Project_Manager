# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # プロダクションビルド
npm run lint       # 型チェック (tsc --noEmit)
```

Docker:
```bash
docker build -t personal-project-manager .
docker run --rm -p 3000:3000 --env-file .env.local personal-project-manager
docker compose up --build
```

Kubernetes:
```bash
kubectl apply -f k8s/secret.example.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## 環境変数

`.env.local` に以下を設定する。値は Firebase Console から取得。

```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

## アーキテクチャ

**技術スタック:** Next.js App Router / TypeScript / Tailwind CSS / Firebase Authentication / Cloud Firestore

### Firebase 設定の流れ

`lib/firebase/runtime-config.ts` がサーバー側で環境変数を読み、`FirebaseWebConfig | null` を返す。
`app/layout.tsx` (Server Component) がこれを呼び出し、クライアントの `<Providers>` に props として渡す。
環境変数が1つでも欠けると `null` が渡り、アプリは「未設定」状態で動作する (`isConfigured: false`)。

### 認証・Firebase インスタンス管理

`app/providers.tsx` がアプリ全体の `AuthContext` を保持する。
Firebase の `auth` と `firestore` インスタンスも同じ context で配布されるため、各画面は `useAuth()` フックからこれらを取得する。
Firebase SDK の初期化は `lib/firebase/client.ts` の `getFirebaseServices()` が config をキーにキャッシュして管理する。

### データアクセス層

```
lib/
  firebase/       # SDK 初期化・設定読み取り
  firestore/
    mappers.ts    # Firestore DocumentSnapshot → 型付きオブジェクト変換
  repositories/
    projects.ts   # projects コレクションの CRUD + リアルタイム購読
    tasks.ts      # projects/{id}/tasks サブコレクションの CRUD + リアルタイム購読
```

Repository 関数は `Firestore` インスタンスを第一引数に取る。リアルタイム購読は `onSnapshot` を使い `Unsubscribe` を返す。
Project 削除時は Firestore がサブコレクションを自動削除しないため、`deleteProject` が先に tasks を手動削除する。

### 画面構成

```
app/
  layout.tsx                  # Firebase 設定読み込み・Providers 注入
  providers.tsx               # AuthContext (auth/firestore/user/signIn/signOut)
  login/page.tsx              # 未認証時のランディング
  projects/
    page.tsx                  # Project 一覧
    [projectId]/page.tsx      # Project 詳細 (Task 一覧 + Task 詳細パネル)
```

共有 UI コンポーネントは `components/` に配置。

### 型定義

`types/index.ts` に `Project`, `Task`, `TaskStatus`, `TaskPriority`, `TaskInput`, `ProjectInput`, `TaskFilters` をまとめて定義。
ステータス・優先度のラベル定数 (`TASK_STATUS_OPTIONS`, `TASK_PRIORITY_OPTIONS`) も同ファイルに置く。

## 役割分担 (docs/dev-workflow.md より)

- **Claude Code**: 要件整理・実装順分解・レビュー・仕様言語化
- **Codex**: 機能実装・型整理・リファクタ・テスト・ビルド修正
- **Gemini**: docs 文書・低リスク UI 文言修正・小さく閉じた実装

Firestore データモデル変更・認証まわり・Docker/Kubernetes 本番設定・複数ファイルにまたがる状態管理変更は Gemini に任せない。
