// @author Claude
// =============================================================================
// Firebase クライアントの初期化・キャッシュ管理
// Firebase SDK のインスタンス（App / Auth / Firestore）を生成・再利用する層。
// =============================================================================

import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

import type { FirebaseWebConfig } from "@/lib/firebase/runtime-config";

/**
 * アプリで使う 3 つの Firebase サービスをまとめた型。
 * Providers コンテキストに渡して、各画面から参照できるようにする。
 */
type FirebaseServices = {
  app: FirebaseApp;     // Firebase App インスタンス（SDK の基点）
  auth: Auth;           // Firebase Authentication インスタンス
  firestore: Firestore; // Cloud Firestore インスタンス
};

// -----------------------------------------------------------------------------
// モジュールスコープのキャッシュ変数
// Next.js のクライアント側では同じモジュールが複数回評価されることがあるため、
// インスタンスをモジュール変数にキャッシュして二重初期化を防ぐ。
// -----------------------------------------------------------------------------
let cachedServices: FirebaseServices | null = null;
let cachedConfigKey = "";

/**
 * FirebaseWebConfig を JSON 文字列にシリアライズしてキャッシュキーにする。
 * 設定が変わったとき（開発時の Hot Reload など）にキャッシュを無効化するために使う。
 */
function getConfigKey(config: FirebaseWebConfig) {
  return JSON.stringify(config);
}

/**
 * Firebase の 3 サービス（App / Auth / Firestore）を取得して返す。
 * 同じ設定で呼ばれた場合はキャッシュ済みのインスタンスを返し、再初期化しない。
 *
 * @param config - runtime-config.ts から読み取った設定値。null なら未設定として null を返す。
 * @returns FirebaseServices | null
 *
 * 学習ポイント:
 *   Firebase SDK は同名の App を複数 initializeApp するとエラーになる。
 *   getApps().length > 0 で「すでに初期化済みか」を確認し、
 *   初期化済みなら getApp() で既存インスタンスを取得するのが定石。
 */
export function getFirebaseServices(
  config: FirebaseWebConfig | null,
): FirebaseServices | null {
  // 設定が null（環境変数未設定）なら何もできないので早期リターン
  if (!config) {
    return null;
  }

  const nextConfigKey = getConfigKey(config);

  // キャッシュヒット: 同じ設定のまま再呼び出しされた場合はキャッシュを返す
  if (cachedServices && cachedConfigKey === nextConfigKey) {
    return cachedServices;
  }

  // getApps() は現在初期化済みの Firebase App 一覧を返す。
  // すでにある場合は getApp() で取得、なければ initializeApp で新規作成。
  const app = getApps().length > 0 ? getApp() : initializeApp(config);

  // 各サービスのインスタンスを app から取得してキャッシュに保存
  cachedServices = {
    app,
    auth: getAuth(app),           // 認証サービス
    firestore: getFirestore(app), // データベースサービス
  };
  cachedConfigKey = nextConfigKey;

  return cachedServices;
}
