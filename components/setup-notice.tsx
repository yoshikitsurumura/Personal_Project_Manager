// =============================================================================
// [cursor] Firebase 未設定時の案内
// readFirebaseWebConfig() が null のとき、Providers が isConfigured: false になり、
// ログイン画面などでこのコンポーネントを表示して .env.local の設定を促す。
// title / message は必要なら呼び出し側で上書き可能。
// =============================================================================

type SetupNoticeProps = {
  title?: string;
  message?: string;
};

export function SetupNotice({
  title = "Firebase の設定が必要です",
  message = "`.env.local` に Firebase Web SDK 用の値を設定してから再読み込みしてください。",
}: SetupNoticeProps) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-7">{message}</p>
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

