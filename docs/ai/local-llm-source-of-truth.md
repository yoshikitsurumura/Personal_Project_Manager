# Local LLM Source of Truth

## 結論

このプロジェクトで現在使うローカル Gemma サーバーの正本は、リポジトリ内 `tools/local-llm-server` ではなく、外部ディレクトリ `C:\Users\mayum\AI_Hub` 側です。

具体的には以下を正本とします。

- `C:\Users\mayum\AI_Hub\scripts\gemma_server.py`
- `C:\Users\mayum\AI_Hub\gemma_server.bat`

Next.js 側は `.env.local` の `GEMMA_BASE_URL` を通じて、このローカルサーバーを呼び出します。

## 背景

リポジトリ内には `tools/local-llm-server/server.py` も存在しますが、現時点では以下の理由で「参考実装 / 旧案」扱いにします。

- Claude Code の実装報告は `AI_Hub` 側を正本としている
- 実際の起動手順として共有されているのも `gemma_server` コマンドである
- docs とレビュー準備メモでも、外部の共通 LLM 環境を前提にしている

## 運用ルール

- ローカル Gemma の起動手順は `AI_Hub` 側を基準に書く
- README の起動方法も `AI_Hub` 側に合わせる
- `tools/local-llm-server` は削除せず残してよいが、正本として扱わない
- 今後 `tools/local-llm-server` を使うなら、改めて正本を切り替える意思決定を行う

## レビュー時の扱い

Codex がレビューする際は、以下を前提に確認します。

- Next.js 側の `GEMMA_BASE_URL` が `AI_Hub` 側サーバーと整合しているか
- README と docs が `AI_Hub` 側の起動手順に揃っているか
- `tools/local-llm-server` を参照している記述が残っていれば、移行漏れとして扱う
