// =============================================================================
// [cursor] 空状態（Empty state）コンポーネント
// リストが 0 件のときに、タイトルと短い説明を枠で囲んで表示する。
// プロジェクト一覧・タスク一覧などで共通利用する。
// =============================================================================

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

