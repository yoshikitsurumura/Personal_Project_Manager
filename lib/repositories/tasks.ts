// @author Claude
// =============================================================================
// Tasks リポジトリ
// Firestore の "projects/{projectId}/tasks" サブコレクションに対する
// CRUD 操作とリアルタイム購読をまとめたデータアクセス層。
// =============================================================================

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";

import { mapTask } from "@/lib/firestore/mappers";
import type { Task, TaskInput } from "@/types";

/**
 * 指定プロジェクトの tasks サブコレクションへの参照を返す。
 * Firestore のサブコレクションパスは "projects/{id}/tasks" の形式。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - 親プロジェクトのドキュメント ID
 */
function tasksCollection(firestore: Firestore, projectId: string) {
  // collection(db, "コレクション", "ドキュメントID", "サブコレクション") の形式
  return collection(firestore, "projects", projectId, "tasks");
}

/**
 * 指定プロジェクトのタスク一覧をリアルタイムで購読する。
 * タスクが追加・更新・削除されるたびに onValue が呼ばれる。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - 購読するプロジェクトの ID
 * @param onValue    - 最新のタスク配列を受け取るコールバック
 * @param onError    - エラーを受け取るコールバック
 * @returns Unsubscribe - 購読解除関数（useEffect の cleanup で呼ぶ）
 *
 * 学習ポイント:
 *   projects.ts の subscribeToProjects と同じ構造。
 *   サブコレクションも同様に onSnapshot でリアルタイム購読できる。
 *   ここでは where 句なし（プロジェクト内の全タスクを取得）。
 */
export function subscribeToTasks(
  firestore: Firestore,
  projectId: string,
  onValue: (tasks: Task[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  // query() の第一引数にコレクション参照、以降に絞り込み条件を渡す
  // ここでは条件なし（全件取得）
  const tasksQuery = query(tasksCollection(firestore, projectId));

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      const tasks = snapshot.docs
        .map((taskSnapshot) => mapTask(projectId, taskSnapshot)) // 型付きオブジェクトに変換
        .sort((left, right) => {
          // updatedAt の新しい順（降順）に並べ替え
          const leftTime = left.updatedAt?.getTime() ?? 0;
          const rightTime = right.updatedAt?.getTime() ?? 0;
          return rightTime - leftTime;
        });

      onValue(tasks);
    },
    (error) => onError(error),
  );
}

/**
 * 新しいタスクをサブコレクションに追加する。
 * addDoc で Firestore が自動的にドキュメント ID を生成する。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - タスクを追加するプロジェクトの ID
 * @param input      - フォームから受け取ったタスクの入力値
 */
export async function createTask(
  firestore: Firestore,
  projectId: string,
  input: TaskInput,
) {
  await addDoc(tasksCollection(firestore, projectId), {
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate,
    createdAt: serverTimestamp(), // サーバー側タイムスタンプ
    updatedAt: serverTimestamp(),
  });
}

/**
 * 既存タスクのフィールドを更新する。
 * setDoc + merge: true で指定フィールドのみ上書きする。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - 親プロジェクトの ID
 * @param taskId     - 更新するタスクのドキュメント ID
 * @param input      - 新しい入力値
 *
 * 学習ポイント:
 *   doc(db, "コレクション", "ID", "サブコレクション", "サブID") で
 *   サブコレクション内の特定ドキュメントを参照できる。
 */
export async function updateTask(
  firestore: Firestore,
  projectId: string,
  taskId: string,
  input: TaskInput,
) {
  await setDoc(
    // サブコレクション内の特定ドキュメントを指定
    doc(firestore, "projects", projectId, "tasks", taskId),
    {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      updatedAt: serverTimestamp(), // 更新時刻を記録
    },
    { merge: true }, // createdAt など更新しないフィールドは保持
  );
}

/**
 * 指定タスクを Firestore から削除する。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - 親プロジェクトの ID
 * @param taskId     - 削除するタスクのドキュメント ID
 */
export async function deleteTask(
  firestore: Firestore,
  projectId: string,
  taskId: string,
) {
  // deleteDoc にドキュメント参照を渡すだけで削除できる
  await deleteDoc(doc(firestore, "projects", projectId, "tasks", taskId));
}
