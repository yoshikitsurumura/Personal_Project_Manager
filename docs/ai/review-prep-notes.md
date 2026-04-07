# Review Prep Notes

## 目的

このメモは、Claude Code と Cursor による実装が一段落したあとに、Codex がレビューしやすいように論点を整理しておくためのものです。  
「今このリポジトリがどこまで進んでいるか」と「後でどこを重点的に見るか」を先に固定します。

## 今の状態

現時点で AI 関連は「計画だけ」ではなく、一部実装済みです。

- `app/api/ai/summarize-project/route.ts`
  - プロジェクト要約 API がある
- `lib/ai/`
  - `runtime-config.ts`
  - `gemma.ts`
  - `provider.ts`
  - `prompts.ts`
  - `schemas.ts`
  - `errors.ts`
- `components/project-detail-screen.tsx`
  - AI 要約ボタンと結果表示が入っている
- `tools/local-llm-server/server.py`
  - ローカル Gemma を HTTP で呼ぶサーバー実装がある
- `.env.local`
  - Firebase だけでなく AI 用の環境変数も入っている

つまり、今は「Gemma 組み込み前」ではなく「Gemma 組み込み途中」です。

## 現時点の構造

大きく分けると構造はこうです。

```text
Next.js UI
  -> /api/ai/summarize-project
    -> lib/ai/gemma.ts
      -> GEMMA_BASE_URL/api/generate
        -> tools/local-llm-server/server.py
```

この構造自体は悪くありません。  
レビューでは「責務分離が維持されているか」と「実装が途中で破綻していないか」を見ればよいです。

## 後でレビューで見る主要論点

### 1. 設計の一貫性

見ること:

- AI 呼び出しが `lib/repositories/*` に混ざっていないか
- Route Handler が orchestration に留まっているか
- UI が Gemma の接続先を直接知らないか
- `summarize-project` 以外の API が増えた場合も同じ設計に揃っているか

### 2. 計画と実装のズレ

今の時点で把握しているズレがあります。

- `docs/gemma-ai-plan.md` では一時期 `GEMMA_BASE_URL=http://127.0.0.1:8000` を想定していた
- 実装は `11434` を使っている
- `docs/ai/local-llm-info.md` は外部の `C:\Users\mayum\AI_Hub\scripts\gemma_inference.py` を前提にしている
- リポジトリ内には `tools/local-llm-server/server.py` という別のローカル API 実装がある

後で必ず確認すること:

- 最終的な正本はどれか
  - `AI_Hub` 側を使うのか
  - `tools/local-llm-server` 側を使うのか
- README と docs と実装が同じ前提に揃っているか

### 3. 実行可能性

見ること:

- `.env.local` だけで起動できるか
- ローカル LLM サーバーをどう起動するかが README で再現可能か
- `npm run typecheck` が通るか
- `npm run build` が通るか
- AI サーバー未起動時に UI が安全に失敗するか

### 4. API 契約

見ること:

- `POST /api/ai/summarize-project` の入出力が安定しているか
- フロントと API で payload 形がズレていないか
- 失敗時のエラー形が UI で扱いやすいか
- 今後 `suggest-next-actions` と `draft-task` を足したときに同じ設計で増やせるか

### 5. UI 統合

見ること:

- `ProjectDetailScreen` に AI 要約を足したことで既存 CRUD が壊れていないか
- ローディング中の状態が自然か
- 失敗時の文言が実運用に耐えるか
- `isAiConfigured` の判定が適切か
- AI 結果が空のときの扱いが破綻していないか

### 6. ローカル LLM サーバー

見ること:

- `tools/local-llm-server/server.py` の API が Next.js 側の期待と一致しているか
- `/health` と `/api/generate` が最小限で安定しているか
- モデルロード失敗時のエラーが見えるか
- `MODEL_PATH` がローカル環境に強く固定されすぎていないか
- メモリ使用やロード時間の影響が README に書かれているか

## 今の時点で見えている整理ポイント

### 整理ポイント 1

AI の情報源が 2 系統あります。

- `docs/ai/local-llm-info.md` が指す `AI_Hub` 側
- リポジトリ内 `tools/local-llm-server` 側

この 2 つが両立するなら役割を書き分ける必要があります。  
片方だけを正式採用するなら、もう片方は README と docs から位置づけを明確にする必要があります。

### 整理ポイント 2

AI 機能は今のところ `summarize-project` だけ実装済みです。  
計画上は `suggest-next-actions` と `draft-task` も予定されていますが、まだ足並みは揃っていません。

後でレビューする際は、未実装なのか中途半端実装なのかをまず切り分ける必要があります。

### 整理ポイント 3

この作業ディレクトリには `.git` がありません。  
つまり通常の `git diff` ベースのレビューがそのままはできません。

レビュー時に必要なもの:

- Claude/Cursor が触ったファイル一覧
- 追加した API 一覧
- 変更した環境変数一覧
- 実行した確認コマンド一覧

これがないと、後からレビュー範囲を狭めにくいです。

## レビュー依頼時に欲しい情報

あとで Codex にレビューを頼むときは、最低でも以下を一緒に渡してもらうと速いです。

- 今回触ったファイル一覧
- 追加したエンドポイント一覧
- `.env.example` をどう変えたか
- ローカル Gemma サーバーの起動方法
- `npm run typecheck` の結果
- `npm run build` の結果
- 未完了の項目があるならその一覧

## レビュー時の進め方

後でレビューする時はこの順番で進めるのが効率的です。

1. 変更ファイル一覧を受け取る
2. AI サーバー起動方法を確認する
3. `typecheck` と `build` の再現性を見る
4. API 契約と UI 側の結線を見る
5. 設計の崩れと docs のズレを見る
6. 最後に未完了項目を分離する

## 今の結論

今のリポジトリは「ぐちゃぐちゃ」ではあるものの、完全に無秩序ではありません。  
現状は「Firebase ベースのタスク管理アプリに、Gemma 要約機能の最初の一本が差し込まれた段階」です。  
一番大きい論点は、ローカル Gemma の実体を `AI_Hub` と `tools/local-llm-server` のどちらに寄せるかです。  
後のレビューでは、まずその正本を決め、その上で API 契約と UI 統合を見れば整理しやすいです。
