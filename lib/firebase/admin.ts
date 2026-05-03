// @author Claude
// =============================================================================
// Firebase ID Token 検証（サーバー専用・依存なし実装）
// Firebase Authentication が発行する ID Token (JWT/RS256) を、
// Google が公開している X.509 証明書を使って検証する。
//
// 設計方針:
//   firebase-admin SDK を持ち込まず、Node 標準の crypto モジュールだけで
//   署名検証とクレーム検証を行う。追加依存なし、サービスアカウント不要、
//   必要な環境変数は FIREBASE_PROJECT_ID のみ。
//
// 学習ポイント:
//   Firebase の ID Token は RS256 で署名された JWT。
//   1) Header の kid フィールドで署名に使われた公開鍵を特定する
//   2) Google の証明書エンドポイントから kid 対応の X.509 を取得する
//   3) 取得した公開鍵で header.payload の署名を検証する
//   4) iss / aud / exp / iat / sub などのクレームを検証する
// =============================================================================

import { createPublicKey, createVerify, type KeyObject } from "node:crypto";

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

/**
 * 検証済み ID Token から取り出した最小限のユーザー情報。
 */
export type VerifiedIdToken = {
  uid: string;
  email: string | null;
  issuedAt: number;
  expiresAt: number;
};

/**
 * 証明書のキャッシュ。
 * Google の証明書エンドポイントは Cache-Control で max-age を指示してくるため、
 * その値に合わせて失効時刻を計算して再取得のタイミングを制御する。
 */
type CertCache = {
  keys: Map<string, KeyObject>;
  expiresAt: number;
};

let certCache: CertCache | null = null;

/**
 * Google の Firebase Auth 用 X.509 証明書を取得し、kid → KeyObject の Map にする。
 * Cache-Control の max-age ぶんメモリにキャッシュして、呼び出しの度に取りに行かない。
 */
async function loadGoogleCerts(): Promise<Map<string, KeyObject>> {
  if (certCache && certCache.expiresAt > Date.now()) {
    return certCache.keys;
  }

  const response = await fetch(GOOGLE_CERTS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Failed to load Firebase public certs: HTTP ${response.status}`,
    );
  }

  const certsByKid = (await response.json()) as Record<string, string>;
  const keys = new Map<string, KeyObject>();
  for (const [kid, pem] of Object.entries(certsByKid)) {
    // createPublicKey は X.509 PEM からも直接公開鍵を取り出せる。
    keys.set(kid, createPublicKey(pem));
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeMatch = /max-age=(\d+)/.exec(cacheControl);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  certCache = {
    keys,
    expiresAt: Date.now() + maxAgeSeconds * 1000,
  };

  return keys;
}

/**
 * base64url エンコード済み文字列を Buffer に戻す。
 * JWT は URL 安全な base64（+ → -, / → _, パディング省略）を使う。
 */
function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

/**
 * JWT のヘッダ・ペイロード・署名部を文字列のまま分解する。
 */
function splitJwt(token: string): {
  header: { alg?: string; kid?: string; typ?: string };
  payload: Record<string, unknown>;
  signingInput: string;
  signature: Buffer;
} {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed ID token.");
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  const signature = base64UrlDecode(signatureB64);

  return {
    header,
    payload,
    signingInput: `${headerB64}.${payloadB64}`,
    signature,
  };
}

/**
 * JWT のクレームを Firebase の仕様に従って検証する。
 * 参考: https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */
function verifyClaims(payload: Record<string, unknown>, projectId: string): VerifiedIdToken {
  const now = Math.floor(Date.now() / 1000);
  const leewaySeconds = 60; // クライアントとサーバーの時計ずれを 60 秒まで許容

  const exp = typeof payload.exp === "number" ? payload.exp : NaN;
  const iat = typeof payload.iat === "number" ? payload.iat : NaN;
  const authTime = typeof payload.auth_time === "number" ? payload.auth_time : NaN;
  const iss = typeof payload.iss === "string" ? payload.iss : "";
  const aud = typeof payload.aud === "string" ? payload.aud : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : null;

  if (!Number.isFinite(exp) || exp < now - leewaySeconds) {
    throw new Error("ID token has expired.");
  }
  if (!Number.isFinite(iat) || iat > now + leewaySeconds) {
    throw new Error("ID token issued-at is in the future.");
  }
  if (!Number.isFinite(authTime) || authTime > now + leewaySeconds) {
    throw new Error("ID token auth_time is in the future.");
  }
  if (iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("ID token has invalid issuer.");
  }
  if (aud !== projectId) {
    throw new Error("ID token has invalid audience.");
  }
  if (!sub) {
    throw new Error("ID token has no subject (uid).");
  }

  return {
    uid: sub,
    email,
    issuedAt: iat,
    expiresAt: exp,
  };
}

/**
 * Firebase Authentication の ID Token を検証して、ユーザー情報を返す。
 * 署名検証とクレーム検証の両方を行う。
 *
 * @param token     - クライアントから送られてきた ID Token（生の JWT 文字列）
 * @param projectId - 期待する Firebase Project ID（aud / iss の検証に使う）
 * @returns VerifiedIdToken - 検証済みの uid と関連情報
 * @throws Error - トークンが無効な場合
 */
export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
): Promise<VerifiedIdToken> {
  const { header, payload, signingInput, signature } = splitJwt(token);

  if (header.alg !== "RS256") {
    throw new Error(`Unsupported JWT algorithm: ${header.alg ?? "unknown"}`);
  }
  if (!header.kid) {
    throw new Error("ID token is missing the kid header.");
  }

  const certs = await loadGoogleCerts();
  const publicKey = certs.get(header.kid);
  if (!publicKey) {
    // 鍵ローテーション直後などは未取得の kid が来る可能性がある。
    // 一度キャッシュを捨てて取り直す。
    certCache = null;
    const refreshed = await loadGoogleCerts();
    const retried = refreshed.get(header.kid);
    if (!retried) {
      throw new Error("No public key matches the ID token kid.");
    }
    return verifyWithKey(retried, signingInput, signature, payload, projectId);
  }

  return verifyWithKey(publicKey, signingInput, signature, payload, projectId);
}

/**
 * 署名検証とクレーム検証をまとめて行う内部ヘルパー。
 */
function verifyWithKey(
  publicKey: KeyObject,
  signingInput: string,
  signature: Buffer,
  payload: Record<string, unknown>,
  projectId: string,
): VerifiedIdToken {
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();

  const ok = verifier.verify(publicKey, signature);
  if (!ok) {
    throw new Error("ID token signature is invalid.");
  }

  return verifyClaims(payload, projectId);
}
