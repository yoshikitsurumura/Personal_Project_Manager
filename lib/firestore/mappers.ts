// @author Claude
// =============================================================================
// Firestore ドキュメント → 型付きオブジェクト 変換（マッパー）
// Firestore から返ってくるデータは型がゆるい（DocumentData = any に近い）ため、
// このファイルで明示的にアプリの型へ変換する。
// =============================================================================

import {
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type { Project, Task } from "@/types";

/**
 * Firestore の Timestamp オブジェクトを JavaScript の Date に変換する。
 * Timestamp 以外の値（null や undefined など）が来たら null を返す。
 *
 * @param value - Firestore から取得した任意の値
 * @returns Date | null
 *
 * 学習ポイント:
 *   Firestore の serverTimestamp() で保存した値は、
 *   取得時に firebase/firestore の Timestamp 型になる。
 *   Date と互換性がないため、toDate() で変換が必要。
 *   value instanceof Timestamp で型ガードしてから変換する。
 */
function asDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate(); // Timestamp → Date
  }

  return null;
}

/**
 * Firestore のドキュメントスナップショットを Project 型に変換する。
 * snapshot.id（ドキュメント ID）と snapshot.data()（フィールド値）を組み合わせる。
 *
 * @param snapshot - onSnapshot / getDocs などで取得した QueryDocumentSnapshot
 * @returns Project
 */
export function mapProject(snapshot: QueryDocumentSnapshot<DocumentData>): Project {
  // スナップショットの ID とデータを分離して mapProjectData に渡す
  return mapProjectData(snapshot.id, snapshot.data());
}

/**
 * プロジェクトの ID とデータオブジェクトから Project 型を組み立てる。
 * getDoc の結果のように snapshot.id と snapshot.data() を別々に持つケースでも使える。
 *
 * @param id   - Firestore ドキュメント ID
 * @param data - Firestore ドキュメントのフィールド（DocumentData）
 * @returns Project
 *
 * 学習ポイント:
 *   `?? ""` は Nullish Coalescing（null/undefined のときだけデフォルト値を使う）。
 *   Firestore のフィールドが存在しない場合に安全に空文字を返せる。
 */
export function mapProjectData(id: string, data: DocumentData): Project {
  return {
    id,
    ownerUid: data.ownerUid ?? "",
    name: data.name ?? "",
    description: data.description ?? "",
    createdAt: asDate(data.createdAt), // Timestamp → Date
    updatedAt: asDate(data.updatedAt), // Timestamp → Date
  };
}

/**
 * Firestore のタスクスナップショットを Task 型に変換する。
 * Task はサブコレクション内にあるため、親の projectId を引数で受け取る。
 *
 * @param projectId - 親プロジェクトの ID（snapshot には含まれないため外から渡す）
 * @param snapshot  - tasks サブコレクションのドキュメントスナップショット
 * @returns Task
 */
export function mapTask(
  projectId: string,
  snapshot: QueryDocumentSnapshot<DocumentData>,
): Task {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    projectId, // サブコレクションのスナップショットには親 ID が入っていないので手動でセット
    title: data.title ?? "",
    description: data.description ?? "",
    status: data.status ?? "todo",       // デフォルトは「未着手」
    priority: data.priority ?? "medium", // デフォルトは「中」優先度
    dueDate: data.dueDate ?? null,       // 期限なしの場合は null
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}
