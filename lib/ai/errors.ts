// @author Claude
// =============================================================================
// AI 関連のエラークラス
// throw / catch で種類を判別できるように、Error を継承した専用クラスを定義する。
//
// 学習ポイント:
//   JavaScript の try/catch では catch した値の型が unknown なので、
//   instanceof でエラーの種類を判定するのが一般的な方法。
//   例:
//     try { ... }
//     catch (e) {
//       if (e instanceof AiConfigurationError) { // 設定エラーの処理 }
//       if (e instanceof AiRequestError)        { // 通信エラーの処理 }
//     }
//
//   Route Handler（app/api/ai/...）では、エラーの種類に応じて
//   HTTP ステータスコードを切り替えている。
//     AiConfigurationError → 503（サービス利用不可）
//     AiUnauthorizedError  → 401（認証が必要）
//     AiRequestError       → 502（上流サーバーエラー）
// =============================================================================

/**
 * AI の設定が不足・不正な場合にスローするエラー。
 * 例: 環境変数 AI_PROVIDER が未設定で AI を使おうとした場合。
 *
 * 学習ポイント:
 *   super(message) で親クラス Error の message を設定し、
 *   this.name を上書きすることで、ログやスタックトレースに
 *   "AiConfigurationError" と表示されるようになる。
 */
export class AiConfigurationError extends Error {
  constructor(message = "AI configuration is missing or invalid.") {
    super(message);   // Error クラスのコンストラクタに message を渡す
    this.name = "AiConfigurationError"; // エラー名をクラス名に設定
  }
}

/**
 * AI バックエンド（Gemini API）への通信失敗時にスローするエラー。
 * 例: API がエラー応答を返した、タイムアウト、空レスポンスなど。
 */
export class AiRequestError extends Error {
  constructor(message = "AI request failed.") {
    super(message);
    this.name = "AiRequestError";
  }
}

/**
 * AI Route Handler の認証が通らなかったときにスローするエラー。
 * 例: Authorization ヘッダが無い / Bearer Token が不正 / 期限切れ / 署名不一致。
 *
 * 設計上の意図:
 *   Firestore のデータは rules で守られているが、AI エンドポイントは
 *   上流 API（Gemini）を呼び出すのでトークン課金の対象になる。
 *   未認証呼び出しを塞ぐことで、デプロイ後の濫用リスクを下げる。
 */
export class AiUnauthorizedError extends Error {
  constructor(message = "Authentication is required for AI endpoints.") {
    super(message);
    this.name = "AiUnauthorizedError";
  }
}
