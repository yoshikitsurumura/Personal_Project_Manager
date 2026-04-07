// @author Claude
// =============================================================================
// Firebase 設定の読み込み（サーバー専用）
// このファイルは Server Component や API Route から呼ばれる。
// process.env は Node.js 側でのみ参照できるため、クライアントから直接呼ばないこと。
// =============================================================================

/**
 * Firebase Web SDK に渡す設定値の型。
 * Firebase Console の「プロジェクトの設定 > 全般 > SDK 設定」に表示される値に対応する。
 */
export type FirebaseWebConfig = {
  apiKey: string;             // Firebase API キー（公開しても安全だが .env で管理推奨）
  authDomain: string;         // 認証用ドメイン（例: your-app.firebaseapp.com）
  projectId: string;          // Firestore / Auth が属するプロジェクト ID
  storageBucket: string;      // Cloud Storage のバケット URL
  messagingSenderId: string;  // Firebase Cloud Messaging 用の送信者 ID
  appId: string;              // アプリを識別する固有 ID
};

/**
 * 1 つの環境変数を読み取り、前後の空白を除いて返す。
 * 値が未定義・空の場合は空文字列を返す（null の代わりに "" にすることで後段の every チェックを統一できる）。
 *
 * @param name - 環境変数名（例: "FIREBASE_API_KEY"）
 */
function readEnv(name: string) {
  // process.env[name] が undefined のときは ?? "" でフォールバック
  // ?.trim() で先頭・末尾のスペースや改行を除去（.env ファイルの書き間違いに対応）
  return process.env[name]?.trim() ?? "";
}

/**
 * .env.local（または実行環境の環境変数）から Firebase 設定を読み取って返す。
 * 1 つでも値が欠けていれば null を返し、アプリを「未設定」状態にする。
 *
 * @returns FirebaseWebConfig - 全項目が揃っている場合
 * @returns null              - 1 つ以上の環境変数が未設定の場合
 *
 * 学習ポイント:
 *   Object.values(config).every(Boolean) は、
 *   オブジェクトのすべての値が truthy（空文字でない）かをチェックする慣用句。
 *   これにより「どれか 1 つでも欠けたら null」という仕様を 1 行で書ける。
 */
export function readFirebaseWebConfig(): FirebaseWebConfig | null {
  const config = {
    apiKey: readEnv("FIREBASE_API_KEY"),
    authDomain: readEnv("FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("FIREBASE_APP_ID"),
  };

  // 全フィールドが空でない（truthy）かチェック
  const isComplete = Object.values(config).every(Boolean);
  return isComplete ? config : null;
}
