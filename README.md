# Personal Project Manager

Next.js、Firebase、Docker、Kubernetes をベースにした個人用プロジェクト管理アプリです。  
現在はローカル Gemma を使った AI 要約機能を段階的に組み込んでいます。

## 現在の主な機能

- Google ログイン
- プロジェクトの作成、更新、削除
- プロジェクト配下のタスク管理
- タスクの status / priority / dueDate 管理
- Project 詳細画面での AI 要約

## セットアップ

1. `.env.example` を `.env.local` にコピーする
2. Firebase Console で Google ログインを有効化する
3. Firestore Database を作成する
4. `npm install`
5. `npm run dev`

## 必須環境変数

### Firebase

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

### AI

- `AI_PROVIDER=gemma`
- `GEMMA_BASE_URL=http://127.0.0.1:11434`
- `GEMMA_MODEL=google/gemma-4-E2B-it`
- `GEMMA_API_KEY=`
- `AI_REQUEST_TIMEOUT_MS=30000`
- `AI_MAX_INPUT_TASKS=100`

## 画面

- `/login`
- `/projects`
- `/projects/[projectId]`

## Firestore

`firestore.rules` を Firebase 側に反映してください。

## Local Gemma API

### Source of truth

現在の正本はリポジトリ内 `tools/local-llm-server` ではなく、外部共通環境 `C:\Users\mayum\AI_Hub` 側です。

- サーバー実体: `C:\Users\mayum\AI_Hub\scripts\gemma_server.py`
- 起動ショートカット: `C:\Users\mayum\AI_Hub\gemma_server.bat`
- 起動コマンド: `gemma_server`

詳細は [local-llm-source-of-truth.md](C:\Users\mayum\開発物\kubernets\docs\ai\local-llm-source-of-truth.md) を参照してください。

### 起動

ターミナル 1:

```powershell
gemma_server
```

モデルロードに時間がかかります。`Application startup complete.` が出たら起動完了です。

ターミナル 2:

```bash
npm run dev
```

### 疎通確認

ヘルスチェック:

```bash
curl http://127.0.0.1:11434/healthz
```

推論確認:

```bash
curl -X POST http://127.0.0.1:11434/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"今日やるべきタスクを3つ要約して\",\"max_new_tokens\":256,\"temperature\":0.4,\"top_p\":0.95}"
```

### 注意

- `11434` は Ollama と競合しやすいポートです
- 競合時は Gemma サーバー側ポートと `.env.local` の `GEMMA_BASE_URL` を同時に変更してください
- UI の `isAiConfigured` は環境変数ベースです。Gemma サーバー停止時は、ボタン押下後に API エラーとして失敗します

## Logs

起動ログは root ではなく `logs/` に置きます。

- `logs/next-start.err.log`
- `logs/next-start.out.log`

## Docker

```bash
docker build -t personal-project-manager .
docker run --rm -p 3000:3000 --env-file .env.local personal-project-manager
```

`docker-compose.yml` を使う場合:

```bash
docker compose up --build
```

## Kubernetes

- `k8s/deployment.yaml`
- `k8s/service.yaml`
- `k8s/ingress.yaml`
- `k8s/secret.example.yaml`

適用例:

```bash
kubectl apply -f k8s/secret.example.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## Docs

- [docs/requirements.md](C:\Users\mayum\開発物\kubernets\docs\requirements.md)
- [docs/dev-workflow.md](C:\Users\mayum\開発物\kubernets\docs\dev-workflow.md)
- [gemma-ai-plan.md](C:\Users\mayum\開発物\kubernets\docs\ai\gemma-ai-plan.md)
- [review-prep-notes.md](C:\Users\mayum\開発物\kubernets\docs\ai\review-prep-notes.md)
- [local-llm-source-of-truth.md](C:\Users\mayum\開発物\kubernets\docs\ai\local-llm-source-of-truth.md)
- [local-llm-info.md](C:\Users\mayum\開発物\kubernets\docs\ai\local-llm-info.md)
