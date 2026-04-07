// =============================================================================
// [cursor] 全画面ローディング
// 認証確認中・遷移待ちなど、ページ全体をスピナーとメッセージで覆う。
// label で文言を差し替えられる（デフォルトは「読み込み中...」）。
// =============================================================================

export function LoadingScreen({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}

