// @author Claude
// =============================================================================
// ヘルスチェックエンドポイント
// Kubernetes の livenessProbe / readinessProbe などから叩かれる。
// GET /healthz にアクセスすると { status: "ok", timestamp: "..." } を返す。
//
// 学習ポイント:
//   Next.js App Router の Route Handler（旧 API Routes に相当）。
//   ファイル名 route.ts に HTTP メソッド名の関数をエクスポートするだけで
//   API エンドポイントになる。
//   Kubernetes では Pod が正常に動いているかを定期的に確認するために使う。
// =============================================================================

/**
 * GET /healthz
 * アプリが起動中であることを示す簡易ヘルスチェックレスポンスを返す。
 *
 * @returns JSON: { status: "ok", timestamp: "<ISO 8601 文字列>" }
 *
 * 学習ポイント:
 *   Response.json() は Next.js / Web API 標準の便利メソッド。
 *   Content-Type: application/json を自動でセットしてくれる。
 *   timestamp を入れることで「いつ応答したか」をログで確認できる。
 */
export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(), // 例: "2024-06-05T14:30:00.000Z"
  });
}
