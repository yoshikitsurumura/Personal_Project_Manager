# 個人用プロジェクト管理アプリ 要件メモ

## 目的
- 日常的に使える個人用 Web アプリを作る。
- Next.js、Firebase、Docker、Kubernetes の基礎を実アプリで学ぶ。
- Codex / Claude Code / Gemini / Cursor / Windsurf を開発フローの中で役割分担して使う。

## MVP でやること
- Google ログイン
- Project の作成・更新・削除
- Project 配下の Task の作成・更新・削除
- Task 一覧と Task 詳細の同時表示
- status / priority / dueDate を使った基本フィルタ

## MVP でやらないこと
- チーム共有
- 通知
- ファイルアップロード
- AI API 連携
- Firebase Hosting
- カンバンやカレンダー表示

## データ構造
- projects
- projects/{projectId}/tasks

## 技術スタック
- Next.js App Router
- TypeScript
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Docker
- Kubernetes

