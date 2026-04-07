"use client";

// @author Claude
// =============================================================================
// プロジェクト一覧ページ
// ログイン済みユーザーが自分のプロジェクトを一覧・作成・編集・削除できる画面。
// =============================================================================

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/app/providers";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { EmptyState } from "@/components/empty-state";
import { ProjectForm } from "@/components/project-form";
import { formatDateTime } from "@/lib/date";
import {
  createProject,
  deleteProject,
  subscribeToProjects,
  updateProject,
} from "@/lib/repositories/projects";
import type { Project, ProjectInput } from "@/types";

export default function ProjectsPage() {
  // Context から Firestore インスタンスとログインユーザーを取得
  const { firestore, user } = useAuth();

  // プロジェクト配列の状態（onSnapshot のたびに更新される）
  const [projects, setProjects] = useState<Project[]>([]);

  // Firestore エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // 編集中のプロジェクト ID（null = 編集モードなし）
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // カスタムフックでリアルタイム購読を管理（useEffect の複雑なロジックを外に出している）
  useProjectSubscription({ firestore, userUid: user?.uid ?? null, onProjects: setProjects, onError: setError });

  /**
   * 新しいプロジェクトを作成する。
   * firestore または user が取れていない場合は早期リターン（防衛的プログラミング）。
   */
  async function handleCreateProject(input: ProjectInput) {
    if (!firestore || !user) {
      return;
    }

    await createProject(firestore, user.uid, input);
    // onSnapshot がデータ変更を検知して projects state を自動更新してくれる
  }

  /**
   * 既存プロジェクトを更新する。
   * 保存後に編集モードを解除する（setEditingProjectId(null)）。
   */
  async function handleUpdateProject(projectId: string, input: ProjectInput) {
    if (!firestore) {
      return;
    }

    await updateProject(firestore, projectId, input);
    setEditingProjectId(null); // 編集フォームを閉じる
  }

  /**
   * プロジェクトを削除する。
   * window.confirm でユーザーに確認を取ってから削除する。
   */
  async function handleDeleteProject(projectId: string) {
    if (!firestore) {
      return;
    }

    // confirm はブロッキングなダイアログ。false（キャンセル）なら何もしない。
    const shouldDelete = window.confirm(
      "プロジェクトを削除すると、その中のタスクも一緒に削除されます。続けますか？",
    );

    if (!shouldDelete) {
      return;
    }

    await deleteProject(firestore, projectId);
  }

  return (
    <AuthenticatedShell
      title="プロジェクト一覧"
      description="個人開発のテーマごとに Project を作り、その中で Task を管理します。"
    >
      {/* xl 以上の幅では左右 2 カラムレイアウト */}
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* 左: 新規プロジェクト作成フォーム */}
        <section>
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-blue-700">New project</p>
          <ProjectForm submitLabel="プロジェクトを作成" onSubmit={handleCreateProject} />
        </section>

        {/* 右: プロジェクト一覧 */}
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-700">Projects</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">自分のプロジェクト</h2>
            </div>
            <p className="text-sm text-slate-500">{projects.length} 件</p>
          </div>

          {/* エラーがある場合のみ表示 */}
          {error ? <p className="mt-5 text-sm text-rose-600">{error}</p> : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {projects.length === 0 ? (
              // プロジェクトがまだない場合の空状態コンポーネント
              <EmptyState
                title="プロジェクトがまだありません"
                description="左側のフォームから最初のプロジェクトを作成してください。"
              />
            ) : (
              projects.map((project) => {
                // このプロジェクトが編集モードかどうか
                const isEditing = editingProjectId === project.id;

                return (
                  // key は React がリストを効率的に再レンダリングするために必要
                  <article
                    key={project.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
                  >
                    {isEditing ? (
                      // 編集モード: フォームを表示
                      <ProjectForm
                        initialValue={{ name: project.name, description: project.description }}
                        submitLabel="変更を保存"
                        onSubmit={(input) => handleUpdateProject(project.id, input)}
                        onCancel={() => setEditingProjectId(null)}
                      />
                    ) : (
                      // 表示モード: プロジェクト情報を表示
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">{project.name}</h3>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              {project.description || "説明はまだありません。"}
                            </p>
                          </div>
                          {/* Next.js の <Link> はクライアントサイドナビゲーション（ページ全体をリロードしない） */}
                          <Link
                            href={`/projects/${project.id}`}
                            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            開く
                          </Link>
                        </div>

                        <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-600">
                          <p>更新日時: {formatDateTime(project.updatedAt)}</p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingProjectId(project.id)} // 編集モードに切り替え
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                          >
                            編集
                          </button>
                          {/* void で非同期関数の戻り値（Promise）を意図的に無視 */}
                          <button
                            type="button"
                            onClick={() => void handleDeleteProject(project.id)}
                            className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            削除
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </AuthenticatedShell>
  );
}

/**
 * プロジェクトのリアルタイム購読を管理するカスタムフック。
 * 購読の開始・解除ロジックをページコンポーネントから分離してテストしやすくする。
 *
 * @param firestore  - Firestore インスタンス（null なら何もしない）
 * @param userUid    - ログインユーザーの UID（null なら何もしない）
 * @param onProjects - 更新されたプロジェクト配列を受け取るコールバック
 * @param onError    - エラーメッセージを受け取るコールバック
 *
 * 学習ポイント:
 *   useEffect の cleanup 関数に unsubscribe を返すことで、
 *   依存配列の値が変わったとき or コンポーネントのアンマウント時に
 *   Firestore の購読が自動解除される。
 *   これがないとメモリリークや不要な通信が発生する。
 */
function useProjectSubscription({
  firestore,
  userUid,
  onProjects,
  onError,
}: {
  firestore: ReturnType<typeof useAuth>["firestore"];
  userUid: string | null;
  onProjects: (projects: Project[]) => void;
  onError: (message: string | null) => void;
}) {
  useEffect(() => {
    // firestore も userUid も揃っていないと購読できない
    if (!firestore || !userUid) {
      return;
    }

    const unsubscribe = subscribeToProjects(
      firestore,
      userUid,
      (items) => {
        onProjects(items);
        onError(null); // 成功したらエラーをクリア
      },
      (subscriptionError) => onError(subscriptionError.message),
    );

    // cleanup: firestore/userUid が変わったときや画面を離れたときに購読解除
    return unsubscribe;
  }, [firestore, onError, onProjects, userUid]);
}
