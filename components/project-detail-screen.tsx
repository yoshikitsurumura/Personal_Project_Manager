"use client";

// @author Claude
// =============================================================================
// プロジェクト詳細画面
// タスク一覧（左カラム）とタスク詳細パネル（右カラム）を組み合わせた画面。
// プロジェクトの読み込み、タスクのリアルタイム購読、タスクの CRUD を管理する。
// =============================================================================

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/providers";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { EmptyState } from "@/components/empty-state";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { TaskList } from "@/components/task-list";
import { compareByDueDate } from "@/lib/date";
import { getProjectById } from "@/lib/repositories/projects";
import { createTask, deleteTask, subscribeToTasks, updateTask } from "@/lib/repositories/tasks";
import type { Project, Task, TaskFilters, TaskInput } from "@/types";

// フィルターの初期値（「すべて表示 / 期限の近い順」）
const DEFAULT_FILTERS: TaskFilters = {
  status: "all",
  priority: "all",
  sortByDueDate: "asc",
};

/**
 * プロジェクト詳細画面コンポーネント。
 * page.tsx から projectId を受け取り、Firestore からデータを取得して表示する。
 *
 * @param projectId - URL から取得したプロジェクトの ID
 */
export function ProjectDetailScreen({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { firestore, user, isAiConfigured } = useAuth();

  // プロジェクト情報（読み込み完了後にセット）
  const [project, setProject] = useState<Project | null>(null);

  // タスク一覧（onSnapshot のたびに更新される）
  const [tasks, setTasks] = useState<Task[]>([]);

  // 詳細パネルで表示中のタスク ID
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 現在のフィルター状態
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);

  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // プロジェクト読み込み中フラグ
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Effect 1: プロジェクト情報を 1 回だけ取得する
  // onSnapshot（リアルタイム）ではなく getDoc（1 回取得）を使っている。
  // プロジェクトの名前・説明はそこまで頻繁に変わらないため。
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!firestore || !user) {
      return;
    }

    const activeFirestore = firestore;

    // isMounted フラグ: コンポーネントがアンマウントされた後に
    // 非同期処理の結果を state にセットしないための安全策
    let isMounted = true;

    async function loadProject() {
      try {
        const nextProject = await getProjectById(activeFirestore, projectId);

        if (!isMounted) {
          return; // すでにアンマウントされていれば何もしない
        }

        if (!nextProject) {
          // プロジェクトが存在しない場合は一覧へリダイレクト
          router.replace("/projects");
          return;
        }

        setProject(nextProject);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "プロジェクトの読込に失敗しました。");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProject(false); // ローディング完了
        }
      }
    }

    void loadProject();

    // cleanup: アンマウント時に isMounted を false にして非同期処理の結果を無視する
    return () => {
      isMounted = false;
    };
  }, [firestore, projectId, router, user]);

  // -------------------------------------------------------------------------
  // Effect 2: タスク一覧をリアルタイム購読する
  // タスクはユーザーが頻繁に更新するためリアルタイム購読が適している。
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!firestore || !user) {
      return;
    }

    const activeFirestore = firestore;

    const unsubscribe = subscribeToTasks(
      activeFirestore,
      projectId,
      (items) => {
        setTasks(items);
        setError(null);

        // タスクがなくなったら選択を解除
        if (items.length === 0) {
          setSelectedTaskId(null);
          return;
        }

        // 選択中のタスクが引き続き存在するなら選択を維持
        // なければ先頭のタスクを自動選択する
        setSelectedTaskId((current) => {
          if (current && items.some((task) => task.id === current)) {
            return current; // 現在の選択を維持
          }

          return items[0].id; // 先頭タスクを自動選択
        });
      },
      (subscriptionError) => setError(subscriptionError.message),
    );

    // cleanup: コンポーネントのアンマウント or 依存配列の変化で購読解除
    return unsubscribe;
  }, [firestore, projectId, user]);

  // -------------------------------------------------------------------------
  // フィルタリング・ソート処理（useMemo でキャッシュ）
  // useMemo は依存する値が変わったときだけ再計算する。
  // 毎レンダリングで filter/sort を走らせるのは非効率なため使う。
  // -------------------------------------------------------------------------
  const filteredTasks = useMemo(() => {
    return [...tasks] // 元の配列を変更しないようにコピー（sort は破壊的操作）
      .filter((task) => (filters.status === "all" ? true : task.status === filters.status))
      .filter((task) => (filters.priority === "all" ? true : task.priority === filters.priority))
      .sort((left, right) => compareByDueDate(left.dueDate, right.dueDate, filters.sortByDueDate));
  }, [filters.priority, filters.sortByDueDate, filters.status, tasks]);

  // 選択中タスクのオブジェクト（フィルター結果を優先し、フィルター外ならタスク全体から探す）
  // フィルターで非表示になっても詳細パネルに表示できるようにする
  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId)
    ?? tasks.find((task) => task.id === selectedTaskId)
    ?? null;

  /**
   * 新しいタスクを作成する（デフォルト値で即作成し、詳細パネルで編集する設計）。
   */
  async function handleCreateTask() {
    if (!firestore || !user) {
      return;
    }

    await createTask(firestore, projectId, {
      title: "新しいタスク",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: null,
    });
    // onSnapshot が反応して tasks state が更新され、新しいタスクが自動選択される
  }

  /**
   * 選択中のタスクを保存する。
   */
  async function handleSaveTask(taskId: string, input: TaskInput) {
    if (!firestore || !user) {
      return;
    }

    await updateTask(firestore, projectId, taskId, input);
  }

  /**
   * 指定タスクを削除する。
   */
  async function handleDeleteTask(taskId: string) {
    if (!firestore || !user) {
      return;
    }

    await deleteTask(firestore, projectId, taskId);
  }

  async function handleSummarizeProject() {
    if (!project || !isAiConfigured) {
      return;
    }

    setIsSummarizing(true);
    setSummaryError(null);

    try {
      const response = await fetch("/api/ai/summarize-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
          },
          tasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
          })),
        }),
      });

      const payload = (await response.json()) as { summary?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "AI 要約の取得に失敗しました。");
      }
      setSummary(payload.summary ?? "");
    } catch (summarizeError) {
      setSummaryError(
        summarizeError instanceof Error ? summarizeError.message : "AI 要約の取得に失敗しました。",
      );
    } finally {
      setIsSummarizing(false);
    }
  }

  return (
    <AuthenticatedShell
      title={project?.name ?? "プロジェクト詳細"} // プロジェクト名が取れていない間はデフォルト文字列
      description={project?.description || "プロジェクトごとのタスク一覧と詳細編集をまとめて扱います。"}
    >
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      {isLoadingProject ? (
        // 読み込み中
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">プロジェクトを読み込んでいます...</p>
        </div>
      ) : !project ? (
        // プロジェクトが見つからない場合（リダイレクト待ちの一瞬）
        <EmptyState
          title="プロジェクトが見つかりません"
          description="一覧に戻って、別のプロジェクトを選択してください。"
        />
      ) : (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">AI 要約</h2>
                <p className="mt-1 text-sm text-slate-600">
                  プロジェクトとタスク全体の要点を AI で短く整理します。
                </p>
              </div>
              <button
                type="button"
                onClick={handleSummarizeProject}
                disabled={!isAiConfigured || isSummarizing}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSummarizing ? "要約生成中..." : "AI要約を生成"}
              </button>
            </div>
            {!isAiConfigured ? (
              <p className="mt-3 text-sm text-amber-700">
                AI 設定が未完了のため、要約機能は利用できません。
              </p>
            ) : null}
            {summaryError ? <p className="mt-3 text-sm text-rose-600">{summaryError}</p> : null}
            {summary ? (
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                {summary}
              </div>
            ) : null}
          </section>

          {/* xl 以上では左右 2 カラム: タスク一覧 | タスク詳細 */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
            <TaskList
              tasks={filteredTasks}
              selectedTaskId={selectedTaskId}
              filters={filters}
              onFiltersChange={setFilters}
              onSelectTask={setSelectedTaskId}
              onCreateTask={handleCreateTask}
            />
            <TaskDetailPanel task={selectedTask} onSave={handleSaveTask} onDelete={handleDeleteTask} />
          </div>
        </div>
      )}
    </AuthenticatedShell>
  );
}
