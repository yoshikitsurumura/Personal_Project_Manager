// @author Claude
// =============================================================================
// 空状態（Empty State）コンポーネント
// リストが 0 件のときに表示する汎用的なプレースホルダー。
// プロジェクト一覧、タスク一覧、タスク詳細パネルなど複数箇所で共通利用する。
//
// 学習ポイント:
//   「空状態」を専用コンポーネントにする理由:
//   1. 「データがない」ことを明示的にユーザーに伝えられる（UX 改善）
//   2. 各画面で同じ見た目を保てる（デザインの一貫性）
//   3. 文言だけ変えて再利用できる（props で title / description を受け取る）
//
//   border-dashed で「ここに何かが入る予定」を視覚的に暗示している。
// =============================================================================

/** EmptyState コンポーネントの props 型 */
type EmptyStateProps = {
  title: string;       // 見出し（例: "プロジェクトがまだありません"）
  description: string; // 補足説明（例: "左側のフォームから最初のプロジェクトを作成してください。"）
};

/**
 * 空状態の表示コンポーネント。
 * 破線ボーダーとセンター寄せのテキストで「まだ中身がない」ことを表現する。
 */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}
