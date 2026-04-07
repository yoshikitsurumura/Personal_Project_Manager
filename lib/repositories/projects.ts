// @author Claude
// =============================================================================
// Projects リポジトリ
// Firestore の "projects" コレクションに対する CRUD 操作と
// リアルタイム購読をまとめたデータアクセス層。
//
// 設計ポイント:
//   - 各関数は Firestore インスタンスを第一引数で受け取る（DI スタイル）。
//   - これにより、呼び出し元がインスタンスの初期化タイミングを制御できる。
// =============================================================================

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";

import { mapProject, mapProjectData } from "@/lib/firestore/mappers";
import type { Project, ProjectInput } from "@/types";

/**
 * "projects" コレクションへの参照を返す。
 * 毎回 collection() を直書きすると変更箇所が増えるため、ここに集約する。
 */
function projectsCollection(firestore: Firestore) {
  return collection(firestore, "projects");
}

/**
 * 指定ユーザーのプロジェクト一覧をリアルタイムで購読する。
 * Firestore の onSnapshot を使い、データが変わるたびに onValue が呼ばれる。
 *
 * @param firestore - Firestore インスタンス
 * @param ownerUid  - フィルタするユーザーの UID（自分のプロジェクトだけ取得）
 * @param onValue   - 新しいプロジェクト配列を受け取るコールバック
 * @param onError   - エラーを受け取るコールバック
 * @returns Unsubscribe - 購読を解除する関数（useEffect の cleanup で呼ぶ）
 *
 * 学習ポイント:
 *   onSnapshot は WebSocket に近い仕組みで、データ変更を即座に受け取れる。
 *   戻り値の unsubscribe を呼ぶとリスナーが解除されメモリリークを防げる。
 *   where("ownerUid", "==", ownerUid) で自分のプロジェクトのみに絞り込む。
 *   sort で updatedAt の新しい順に並べ直してから onValue に渡す。
 */
export function subscribeToProjects(
  firestore: Firestore,
  ownerUid: string,
  onValue: (projects: Project[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  // where 句で ownerUid が一致するドキュメントだけを対象にするクエリを作成
  const projectsQuery = query(
    projectsCollection(firestore),
    where("ownerUid", "==", ownerUid),
  );

  return onSnapshot(
    projectsQuery,
    (snapshot) => {
      // snapshot.docs は変更後の全ドキュメント配列
      const projects = snapshot.docs
        .map((projectSnapshot) => mapProject(projectSnapshot)) // Firestore → 型付きオブジェクトに変換
        .sort((left, right) => {
          // updatedAt が新しい順（降順）に並べる
          // null の場合は 0 として扱い、末尾に送る
          const leftTime = left.updatedAt?.getTime() ?? 0;
          const rightTime = right.updatedAt?.getTime() ?? 0;
          return rightTime - leftTime; // 大きい（新しい）ほど前に来る
        });

      onValue(projects);
    },
    // Firestore のエラー（権限不足、ネットワーク切断など）はここで受け取る
    (error) => onError(error),
  );
}

/**
 * 新しいプロジェクトを Firestore に追加する。
 * addDoc は Firestore が自動でドキュメント ID を生成する。
 *
 * @param firestore - Firestore インスタンス
 * @param ownerUid  - 作成者のユーザー UID
 * @param input     - フォームから受け取ったプロジェクトの入力値
 *
 * 学習ポイント:
 *   serverTimestamp() はサーバー側の現在時刻を使う特殊な値。
 *   クライアントの時計がずれていても正確なタイムスタンプを記録できる。
 */
export async function createProject(
  firestore: Firestore,
  ownerUid: string,
  input: ProjectInput,
) {
  await addDoc(projectsCollection(firestore), {
    ownerUid,
    name: input.name,
    description: input.description,
    createdAt: serverTimestamp(), // サーバー側の現在時刻
    updatedAt: serverTimestamp(),
  });
}

/**
 * 既存プロジェクトの名前・説明・更新日時を上書き更新する。
 * setDoc + merge: true で指定フィールドだけを更新する（他フィールドは保持）。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - 更新するドキュメント ID
 * @param input      - 新しい名前と説明
 *
 * 学習ポイント:
 *   setDoc は「指定ドキュメントを完全に上書き」するが、
 *   { merge: true } オプションをつけると「フィールドを部分更新」になる。
 *   updateDoc でも同じことができるが、setDoc + merge の方が冪等性（何度実行しても同じ結果）が高い。
 */
export async function updateProject(
  firestore: Firestore,
  projectId: string,
  input: ProjectInput,
) {
  await setDoc(
    doc(firestore, "projects", projectId), // 更新対象ドキュメントの参照
    {
      name: input.name,
      description: input.description,
      updatedAt: serverTimestamp(),
    },
    { merge: true }, // 既存フィールドを保持しつつ上記フィールドだけ更新
  );
}

/**
 * プロジェクトに属するタスクを全件削除する（プロジェクト削除の前処理）。
 * Firestore はサブコレクションを自動削除しないため手動で行う必要がある。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - 削除するプロジェクトの ID
 *
 * 学習ポイント:
 *   getDocs でサブコレクションの全ドキュメントを一括取得し、
 *   Promise.all で並列に削除する（逐次削除より高速）。
 *   taskSnapshot.ref はドキュメント参照を直接返すので、改めて doc() を呼ばなくてよい。
 */
async function deleteProjectTasks(firestore: Firestore, projectId: string) {
  const tasksSnapshot = await getDocs(collection(firestore, "projects", projectId, "tasks"));

  // 各タスクの削除を並列実行し、すべて完了するまで待つ
  await Promise.all(tasksSnapshot.docs.map((taskSnapshot) => deleteDoc(taskSnapshot.ref)));
}

/**
 * プロジェクトとその配下のタスクをすべて削除する。
 * Firestore の制約でサブコレクションは自動削除されないため、
 * 先にタスクを削除してからプロジェクト本体を削除する。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - 削除するプロジェクトの ID
 */
export async function deleteProject(firestore: Firestore, projectId: string) {
  // ① 先にサブコレクション（tasks）を全削除
  await deleteProjectTasks(firestore, projectId);
  // ② プロジェクト本体を削除
  await deleteDoc(doc(firestore, "projects", projectId));
}

/**
 * プロジェクト ID を指定して 1 件取得する。
 * 存在しない場合は null を返す。
 *
 * @param firestore  - Firestore インスタンス
 * @param projectId  - 取得するドキュメント ID
 * @returns Project | null
 *
 * 学習ポイント:
 *   getDoc は 1 回だけデータを取得する（onSnapshot と違いリアルタイム購読ではない）。
 *   snapshot.exists() で「ドキュメントが実際に存在するか」を確認してから使う。
 */
export async function getProjectById(
  firestore: Firestore,
  projectId: string,
): Promise<Project | null> {
  const snapshot = await getDoc(doc(firestore, "projects", projectId));

  // ドキュメントが存在しなければ null を返す
  if (!snapshot.exists()) {
    return null;
  }

  // snapshot.id = ドキュメント ID、snapshot.data() = フィールド値
  return mapProjectData(snapshot.id, snapshot.data());
}
