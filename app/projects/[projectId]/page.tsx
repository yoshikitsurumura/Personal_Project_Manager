// @author Claude
// =============================================================================
// プロジェクト詳細ページ（動的ルート）
// URL: /projects/:projectId
//
// 学習ポイント:
//   Next.js App Router の動的ルート。
//   フォルダ名 [projectId] の角括弧が「動的セグメント」を意味する。
//   params から projectId を取り出して子コンポーネントに渡す。
//
//   params は Next.js 15 から Promise になったため await が必要。
// =============================================================================

import { ProjectDetailScreen } from "@/components/project-detail-screen";

/**
 * プロジェクト詳細ページ。
 * URL の :projectId を受け取り、ProjectDetailScreen に渡す薄いラッパー。
 *
 * @param params - Next.js が注入する URL パラメータ（Promise<{ projectId: string }>）
 */
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  // Next.js 15 以降では params が非同期になったため await で解決する
  const { projectId } = await params;

  // 実際の UI ロジックは ProjectDetailScreen に委譲（画面ロジックとルーティングを分離）
  return <ProjectDetailScreen projectId={projectId} />;
}
