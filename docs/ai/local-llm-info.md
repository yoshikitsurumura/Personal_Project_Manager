# ローカルLLM環境セットアップ情報

このドキュメントは、ローカル環境に構築されたGemmaモデルの情報を他のAIエージェントに共有するためのものです。

## モデル情報
- **モデル名**: `google/gemma-4-E2B-it`
- **特徴**: Googleが公開した軽量なマルチモーダル対応オープンモデル（2Bパラメータ）。テキスト、画像、音声等の入力を処理し、思考モード（Thinking Mode）も備えています。
- **ライセンス**: Apache License 2.0

## 環境と配置場所
モデルは他のプロジェクトからも共通で利用できるように、専用のディレクトリに配置されています。

- **共通ルートディレクトリ**: `C:\Users\mayum\AI_Hub`
- **モデル本体のパス**: `C:\Users\mayum\AI_Hub\models\gemma-4-E2B-it`
- **実行用Pythonスクリプト**: `C:\Users\mayum\AI_Hub\scripts\gemma_inference.py`
- **実行用バッチファイル**: `C:\Users\mayum\AI_Hub\gemma.bat`

## 実行方法
`C:\Users\mayum\AI_Hub` はユーザーの環境変数 `PATH` に追加されています（※設定反映のためターミナルの再起動が必要な場合があります）。

どのプロジェクトのターミナルからでも、以下のコマンドで推論スクリプトを起動できます。

```bash
gemma
```

起動後、対話形式でモデルにプロンプトを送信できます。終了する場合は `exit` を入力します。

## 開発・連携上の注意点（AIエージェント向け）
- このモデルはローカルマシンのリソースを使用して推論を行います（初期ロード時にメモリを消費します）。
- Pythonスクリプト (`gemma_inference.py`) は `torch.bfloat16` と `device_map="auto"` を使用してメモリ効率を高めています。
- 他のスクリプトからAPI的に呼び出したい場合は、この `gemma_inference.py` をベースにFastAPI等でローカルサーバー化する拡張が容易です。

## このリポジトリで追加した FastAPI サーバー
このプロジェクトには `tools/local-llm-server/server.py` を追加済みです。

- **エンドポイント**: `POST http://127.0.0.1:11434/api/generate`
- **ヘルスチェック**: `GET http://127.0.0.1:11434/health`
- **起動**: `tools/local-llm-server/run.ps1`

`GEMMA_BASE_URL=http://127.0.0.1:11434` を Next.js 側に設定すれば、サーバー経由の呼び出し先として利用できます。
