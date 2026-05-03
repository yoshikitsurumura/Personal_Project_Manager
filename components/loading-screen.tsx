// @author Claude
// =============================================================================
// 全画面ローディングコンポーネント
// 認証状態の確認中やページ遷移の待機中など、
// 画面全体をスピナーとメッセージで覆うローディング表示。
//
// 学習ポイント:
//   CSS アニメーション:
//   - animate-spin: Tailwind 組み込みの回転アニメーション（@keyframes spin）
//   - border-t-blue-600: 上辺だけ青くして、回転時にスピナーに見せるテクニック
//   - 残りの3辺は border-slate-200（薄いグレー）にしておくと
//     回転する部分が強調される
//
//   デフォルト引数:
//   - label = "読み込み中..." とすることで、props 省略時は日本語のデフォルト文言になる
// =============================================================================

/**
 * 全画面ローディングコンポーネント。
 *
 * @param label - 表示するメッセージ（省略時: "読み込み中..."）
 */
export function LoadingScreen({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        {/* CSS のみのスピナー（JavaScript 不要、軽量） */}
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}
