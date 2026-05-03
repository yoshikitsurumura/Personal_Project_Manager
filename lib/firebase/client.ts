// @author Claude
// =============================================================================
// Firebase クライアントの初期化・キャッシュ管理
// Firebase SDK のインスタンス（App / Auth / Firestore）を生成・再利用する層。
// =============================================================================

import { deleteApp, initializeApp, getApps, type FirebaseApp } from "firebase/app";
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
 *   さらに Next.js の HMR ではモジュールが再評価されて cachedServices は初期化されるが、
 *   Firebase SDK 側の App レジストリ（getApps()）は残り続ける。
 *   このため、config が変わった or キャッシュが無い状態で既存 App が残っていれば
 *   先に deleteApp で片付けてから initializeApp することで、
 *   「古い config の App が再利用される」状態を避ける。
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

  // config が変化した（あるいは初回）ので、既に初期化済みの App があれば破棄する。
  // deleteApp は Promise を返すが、App はレジストリから同期的に外れるため、
  // 直後の initializeApp は default 名の衝突を起こさない。
  for (const existingApp of getApps()) {
    void deleteApp(existingApp);
  }
  cachedServices = null;

  const app = initializeApp(config);

  // 各サービスのインスタンスを app から取得してキャッシュに保存
  cachedServices = {
    app,
    auth: getAuth(app),           // 認証サービス
    firestore: getFirestore(app), // データベースサービス
  };
  cachedConfigKey = nextConfigKey;

  return cachedServices;
}
