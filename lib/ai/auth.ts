// @author Claude
// =============================================================================
// AI Route Handler 用の認証ヘルパー
// Authorization: Bearer <idToken> ヘッダから Firebase の ID Token を取り出し、
// verifyFirebaseIdToken で検証する。
//
// このモジュールは Route Handler の冒頭で呼ぶことを想定している。
// 失敗時は AiUnauthorizedError / AiConfigurationError を投げるため、
// 既存の errors 分岐ロジックにそのまま乗る（401 / 503 に変換される）。
// =============================================================================

import { AiConfigurationError, AiUnauthorizedError } from "@/lib/ai/errors";
import {
  verifyFirebaseIdToken,
  type VerifiedIdToken,
} from "@/lib/firebase/admin";

/**
 * 環境変数から検証に必要な Firebase Project ID を取り出す。
 * readFirebaseWebConfig と完全に同じ値なので、クライアント用 config が
 * 揃っているならサーバー用としても必ず取れる。
 */
function readFirebaseProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
}

/**
 * Request の Authorization ヘッダから Bearer Token を取り出す。
 * 欠落・形式不正の場合は null を返す。
 */
function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  // 大文字小文字の揺れと余分な空白に一応対応
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * AI Route Handler の冒頭で呼び、認証を強制する。
 *
 * @param request - Next.js Route Handler の Request オブジェクト
 * @returns VerifiedIdToken - 認証済みユーザーの uid などを含む
 * @throws AiConfigurationError - サーバーの Project ID が未設定
 * @throws AiUnauthorizedError  - Bearer Token の欠落・不正・期限切れ
 */
export async function requireAuthenticatedUser(
  request: Request,
): Promise<VerifiedIdToken> {
  const projectId = readFirebaseProjectId();
  if (!projectId) {
    // Firebase 自体が未設定なら、AI 呼び出しも成立しないので 503 相当。
    throw new AiConfigurationError(
      "FIREBASE_PROJECT_ID is not configured on the server.",
    );
  }

  const token = extractBearerToken(request);
  if (!token) {
    throw new AiUnauthorizedError("Missing Bearer token.");
  }

  try {
    return await verifyFirebaseIdToken(token, projectId);
  } catch (error) {
    throw new AiUnauthorizedError(
      error instanceof Error ? error.message : "Invalid ID token.",
    );
  }
}
