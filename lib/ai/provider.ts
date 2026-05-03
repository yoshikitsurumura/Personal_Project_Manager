// @author Claude
// =============================================================================
// AI プロバイダのインターフェース（抽象層）
// Gemini 以外のモデルへ差し替えやすくするために、
// 「テキスト生成」に必要な入力型と振る舞いだけを定義している。
//
// 現状は gemini.ts のみが AiProvider を実装しているが、
// 将来 OpenAI や Claude 等を追加する場合はこの型に合わせた実装を増やす。
//
// 学習ポイント:
//   これは「依存性逆転の原則（DIP）」の小さな実例。
//   Route Handler は AiProvider という抽象にだけ依存し、
//   具体実装（gemini.ts）に直接依存しない。
//   こうすることで、呼び出し元を変更せずにバックエンドを差し替えられる。
// =============================================================================

/**
 * AI テキスト生成の入力パラメータ。
 * すべてのプロバイダ共通の契約。
 */
export type AiGenerateInput = {
  prompt: string;         // モデルに送る文章
  temperature?: number;   // 生成のランダム性（0 = 決定的、高いほど多様）
  maxNewTokens?: number;  // 生成する最大トークン数
  topP?: number;          // nucleus sampling の閾値（1.0 に近いほど自由）
};

/**
 * AI プロバイダのインターフェース。
 * generate メソッド 1 つだけを持つシンプルな契約。
 *
 * 学習ポイント:
 *   TypeScript では interface ではなく type でも同じように振る舞いの型を定義できる。
 *   ここでは type を使っている。interface と type の違いは:
 *   - interface: 宣言マージ（同名を複数宣言可）・extends 構文
 *   - type: ユニオン型やインターセクション型が書きやすい
 *   どちらでもOKだが、オブジェクト形状だけなら好みの問題。
 */
export type AiProvider = {
  /**
   * プロンプトを送ってテキストを生成する。
   *
   * @param input - 生成パラメータ（prompt は必須、他は省略可）
   * @returns 生成されたテキスト文字列
   * @throws AiRequestError - バックエンド通信失敗 / タイムアウト / 空レスポンス
   */
  generate(input: AiGenerateInput): Promise<string>;
};
