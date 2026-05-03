// @author Claude
// =============================================================================
// Firebase 未設定時の案内コンポーネント
// readFirebaseWebConfig() が null を返した場合に表示される。
// ユーザーに .env.local の設定が必要であることを案内する。
//
// 学習ポイント:
//   デフォルト引数パターン:
//   title / message にデフォルト値を設定しておくことで、
//   呼び出し側が props を省略しても適切なメッセージが表示される。
//   将来的に AI 未設定時の案内にも同じコンポーネントを
//   文言を変えて再利用できる設計。
// =============================================================================

/** SetupNotice コンポーネントの props 型 */
type SetupNoticeProps = {
  title?: string;   // 見出し（省略時: "Firebase の設定が必要です"）
  message?: string; // 説明文（省略時: .env.local の設定を促すメッセージ）
};

/**
 * 環境変数が未設定であることを案内するコンポーネント。
 * アンバー（琥珀色）系の配色で「警告（ただしエラーではない）」を表現する。
 */
export function SetupNotice({
  title = "Firebase の設定が必要です",
  message = "`.env.local` に Firebase Web SDK 用の値を設定してから再読み込みしてください。",
}: SetupNoticeProps) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-7">{message}</p>

      {/* 必要な環境変数の一覧を表示（ユーザーが何を設定すべきか明確にする） */}
      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-7">
        <p>必要な環境変数:</p>
        <ul className="mt-2 list-disc pl-5">
          <li>FIREBASE_API_KEY</li>
          <li>FIREBASE_AUTH_DOMAIN</li>
          <li>FIREBASE_PROJECT_ID</li>
          <li>FIREBASE_STORAGE_BUCKET</li>
          <li>FIREBASE_MESSAGING_SENDER_ID</li>
          <li>FIREBASE_APP_ID</li>
        </ul>
      </div>
    </div>
  );
}
