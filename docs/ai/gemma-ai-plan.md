# Gemma AI 組み込み計画

## 位置づけ

このドキュメントは `Gemma` を本アプリの AI 機能として組み込むための計画書です。  
実装そのものは `Claude Code` と `Cursor` に担当させる前提で整理しています。  
`Codex` は計画作成、責務整理、実装順の明文化までを担当し、実装担当ではありません。

## 実装担当

- `Claude Code`
  - サーバー側 API 設計
  - AI 呼び出し層の実装
  - 環境変数の整理
  - 例外処理と最低限のテスト
- `Cursor`
  - UI 側の導線追加
  - AI 結果表示コンポーネント実装
  - 既存画面への統合
  - 微調整と UX 改善
- `Codex`
  - 計画書作成
  - 実装対象と責務分割の整理
  - Claude/Cursor 向けの作業指示の明文化

## 目的

プロジェクトとタスクの情報をもとに、ユーザーが次の AI 支援を使える状態を目標にします。

- プロジェクト全体の要約
- タスク一覧からの次アクション提案
- 優先度の再整理案
- 期限遅延リスクの指摘
- タスク説明文のたたき台生成

## 前提

- フロントエンドは `Next.js App Router`
- データは `Firebase Authentication` と `Cloud Firestore`
- 現状のアプリは `projects` と `projects/{projectId}/tasks` を中心に構成されている
- AI 呼び出しはクライアントから直接行わず、必ずサーバー経由にする
- Gemma は将来的な差し替えを考慮し、直接埋め込まず `provider` 層を 1 枚挟む

## 現在のローカル Gemma 環境

`docs/ai/local-llm-info.md` の内容を前提にすること。  
このマシンには既に Gemma 実行環境があり、まずはそれを使う方針にします。

- モデル名: `google/gemma-4-E2B-it`
- 共通ルート: `C:\Users\mayum\AI_Hub`
- モデル本体: `C:\Users\mayum\AI_Hub\models\gemma-4-E2B-it`
- 推論スクリプト: `C:\Users\mayum\AI_Hub\scripts\gemma_inference.py`
- 起動バッチ: `C:\Users\mayum\AI_Hub\gemma.bat`
- `PATH` 追加済みのため、ターミナルから `gemma` コマンドで起動可能

### この情報から決めること

- 初期実装では `Gemma` はクラウド API 前提ではなく、ローカル実行前提で設計する
- ただし Next.js から直接対話式 CLI を叩くのは不安定なので、API 化レイヤーを 1 枚用意する
- 実装担当の Claude/Cursor は「今ある `gemma_inference.py` を再利用する」ことを優先し、別実装を乱立させない

## 推奨アーキテクチャ

### 基本方針

クライアントコンポーネントから Gemma を直接呼ばず、`/api/ai/*` を入口にします。  
さらにその裏側で `Gemma Provider` を呼ぶ構成にします。

### 理由

- API キーや接続先をクライアントに出さずに済む
- ローカル Gemma から別モデルへ差し替えやすい
- タイムアウト、入力制限、ログ出力をサーバー側で一元化できる
- Firebase の repository 層に AI 実装を混ぜずに済む

## 推奨構成

```text
app/
  api/
    ai/
      summarize-project/route.ts
      suggest-next-actions/route.ts
      draft-task/route.ts

lib/
  ai/
    provider.ts        # AI provider interface
    gemma.ts           # Gemma 実装
    prompts.ts         # Prompt 組み立て
    schemas.ts         # 入出力バリデーション
    errors.ts          # AI 関連例外
```

## ローカル Gemma 接続方針

### 推奨順序

1. `gemma_inference.py` を HTTP API として呼べるようにする
2. Next.js Route Handler からそのローカル API を呼ぶ
3. UI は Next.js の API だけを見る

### 理由

- 対話式 CLI を `child_process` で毎回制御するのは壊れやすい
- バッチファイル `gemma.bat` は人手起動向きで、アプリ統合向きではない
- `docs/ai/local-llm-info.md` にも FastAPI 化しやすいと明記されている

### 実装上の分岐

- 第一候補
  - `C:\Users\mayum\AI_Hub\scripts\gemma_inference.py` を FastAPI 等でローカルサーバー化
- 第二候補
  - 既存 Python スクリプトを 1-shot 実行するラッパーを作る
- 非推奨
  - `gemma` CLI の対話モードを無理に Node から操作する

## 環境変数計画

初期実装では以下を想定します。

```env
AI_PROVIDER=gemma
GEMMA_MODE=local-api
GEMMA_BASE_URL=http://127.0.0.1:8000
GEMMA_MODEL=google/gemma-4-E2B-it
AI_REQUEST_TIMEOUT_MS=30000
AI_MAX_INPUT_TASKS=100
```

### 補足

- `GEMMA_MODE=local-api` を明示し、ローカル API 接続であることを表す
- `GEMMA_BASE_URL` は FastAPI 化したローカルサーバーの URL を想定する
- もし FastAPI 化しない場合は `GEMMA_MODE=local-script` を追加してもよい
- ただし初回実装でモードを増やしすぎないこと

## MVP スコープ

最初の実装範囲は以下に絞ります。

- プロジェクト詳細画面で `AI 要約` を実行できる
- タスク一覧から `次にやること提案` を取得できる
- 新規タスク作成時に `説明文たたき台` を生成できる
- AI 失敗時に UI が壊れず、通常のタスク管理機能を継続利用できる

## 今回やらないこと

- チャット履歴の長期保存
- ベクトル検索
- RAG
- 音声入力
- 添付ファイル解析
- 自動実行エージェント化
- Firebase Functions への移設

## 実装フェーズ

### Phase 0: ローカル Gemma の API 化

これは Claude Code 側の先行作業です。  
Next.js に組み込む前に、ローカル Gemma を HTTP 経由で叩けるようにします。

- `gemma_inference.py` をベースに `FastAPI` サーバー化する
- `POST /generate` のような単純な API を 1 本用意する
- 入力は `prompt`
- 出力は `text`
- タイムアウトと起動失敗を返せるようにする
- 単発の curl もしくは PowerShell で疎通確認する

### Phase 1: Next.js 側の土台

- `lib/ai/provider.ts` にインターフェースを定義
- `lib/ai/gemma.ts` にローカル API 呼び出し実装を追加
- `app/api/ai/summarize-project/route.ts` を追加
- 入出力の schema を定義
- タイムアウト、空レスポンス、異常レスポンスの扱いを統一

### Phase 2: 画面統合

- `components/project-detail-screen.tsx` に AI 要約導線を追加
- ローディング状態、成功表示、失敗表示を追加
- 同一画面で再実行可能にする
- AI 実行中も既存 CRUD を妨げないようにする

### Phase 3: 提案機能

- `suggest-next-actions` API を追加
- タスク一覧の内容から優先順位付き提案を返す
- 提案文をそのまま UI 表示できるよう整形する
- タスク件数が多い場合はサーバー側で上限を設ける

### Phase 4: タスク草案生成

- `draft-task` API を追加
- プロジェクト文脈からタスク説明文を生成する
- ユーザー入力の上書きではなく初期案として扱う
- 明示的なボタン操作時のみ実行する

## 画面ごとの変更対象

### 既存ファイル

- `components/project-detail-screen.tsx`
  - AI 要約と次アクション提案の導線追加
- `components/task-detail-panel.tsx`
  - 説明文草案生成の導線追加
- `app/projects/page.tsx`
  - 将来的に一覧画面用 AI 導線を置く余地はあるが MVP では必須ではない

### 新規ファイル候補

- `app/api/ai/summarize-project/route.ts`
- `app/api/ai/suggest-next-actions/route.ts`
- `app/api/ai/draft-task/route.ts`
- `lib/ai/provider.ts`
- `lib/ai/gemma.ts`
- `lib/ai/prompts.ts`
- `lib/ai/schemas.ts`

## Firestore との責務分離

Firestore の repository 層はそのまま維持します。  
AI 実装のために `lib/repositories/projects.ts` や `lib/repositories/tasks.ts` にモデル呼び出しを混ぜない方針を維持します。

責務は以下で分けます。

- Repository 層
  - Firestore からデータを読む
  - Firestore に書く
- AI 層
  - prompt を作る
  - Gemma を呼ぶ
  - 結果を整形する
- API 層
  - 入力検証
  - repository と AI 層のオーケストレーション
  - HTTP レスポンス整形

## Claude Code への実装依頼事項

- `Phase 0` を最優先で実装する
- 既存の `C:\Users\mayum\AI_Hub\scripts\gemma_inference.py` を流用し、別系統の Gemma 実装を増やさない
- AI provider 抽象化を先に入れる
- Gemma 呼び出しコードを `lib/ai` に閉じ込める
- Route Handler に入力検証を入れる
- 失敗時は 500 を返すだけでなく、UI 用に意味のあるエラー形にする
- `.env.example` に AI 用環境変数を追加する
- `README.md` に AI 設定手順を追記する

## Cursor への実装依頼事項

- Project 詳細画面に AI セクションを追加する
- AI 実行ボタン、ローディング、結果表示、再実行 UI を実装する
- Task 詳細パネルに草案生成ボタンを追加する
- UI は既存デザインを壊さず、導線を増やしすぎない
- AI が未設定でも画面全体が壊れないことを確認する
- Claude Code が先に用意した API 契約を変えずに使う

## 受け入れ条件

- ローカル Gemma API が単独で疎通確認できる
- 環境変数未設定時に AI ボタンが安全に無効化または説明表示される
- プロジェクト詳細画面から AI 要約が取得できる
- タスク一覧ベースの次アクション提案が取得できる
- タスク説明文の草案生成ができる
- AI が失敗しても既存の Firestore CRUD は壊れない
- `npm run build` と `npm run typecheck` が通る

## 実装順の推奨

1. Claude Code がローカル Gemma を API 化する
2. Claude Code が `lib/ai` と `app/api/ai/summarize-project` を作る
3. Cursor が `project-detail-screen.tsx` に AI 要約 UI を載せる
4. Claude Code が `suggest-next-actions` と `draft-task` を追加する
5. Cursor が UI 統合を広げる
6. 最後に Claude Code が README と `.env.example` を整備する

## 注意点

- クライアントから Gemma の接続先を直接叩かない
- `gemma.bat` の対話モードをアプリ本番導線に使わない
- prompt に生の Firestore オブジェクトをそのまま投げない
- タスク件数が多い場合の入力制限を最初から入れる
- レスポンス形式は自由文だけでなく、できるだけ構造化する
- 実装担当の Claude/Cursor は、まず `Phase 0`、`Phase 1`、`Phase 2` だけを完了対象にして進める

## 結論

このマシンでは既に Gemma のローカル環境があるため、最初にやるべきことは「その既存資産を API 化すること」です。  
その上で、Next.js 側には薄い AI 基盤と Project 詳細画面の AI 要約導線を入れるのが最短です。  
実装担当は `Claude Code` と `Cursor` であり、このドキュメントはその実装指示書として使います。
