"use client";

// =============================================================================
// 認証コンテキスト（Client Component）
// アプリ全体の認証状態・Firebase サービスを React Context で配布する。
//
// 学習ポイント:
//   Context パターンとは:
//     「props のバケツリレー」を避けるための仕組み。
//     createContext → Provider で値を提供し、
//     useContext → useAuth() フックで深いコンポーネントからも取り出せる。
// =============================================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

import { getFirebaseServices } from "@/lib/firebase/client";
import type { FirebaseWebConfig } from "@/lib/firebase/runtime-config";

/**
 * Context に格納する値の型。
 * useAuth() の戻り値の型と一致する。
 */
type AuthContextValue = {
  user: User | null;             // ログイン中ユーザー（未ログインなら null）
  loading: boolean;              // 認証状態の初回確認中は true
  auth: Auth | null;             // Firebase Auth インスタンス
  firestore: Firestore | null;   // Firestore インスタンス
  isConfigured: boolean;         // Firebase の設定が揃っているか
  isAiConfigured: boolean;       // AI の設定が揃っているか
  signInWithGoogle: () => Promise<void>;  // Google ログイン関数
  signOutUser: () => Promise<void>;       // ログアウト関数
};

// Context を作成。初期値は null（Provider 外で useAuth を呼んだときのエラー検出用）
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * アプリ全体を包む Provider コンポーネント。
 * layout.tsx からレンダリングされ、すべての子コンポーネントに Context を提供する。
 *
 * @param children       - 子コンポーネント
 * @param firebaseConfig - サーバー側で読み取った Firebase 設定（null なら未設定）
 */
export function Providers({
  children,
  firebaseConfig,
  aiConfigured,
}: {
  children: ReactNode;
  firebaseConfig: FirebaseWebConfig | null;
  aiConfigured: boolean;
}) {
  // Firebase サービスのインスタンスを取得（設定がなければ null）
  const services = getFirebaseServices(firebaseConfig);

  // ログイン中ユーザーの状態（null = 未ログイン or 確認前）
  const [user, setUser] = useState<User | null>(null);

  // 認証状態を初回確認している最中かどうか
  // auth がある場合は onAuthStateChanged の応答を待つため true で初期化
  const [loading, setLoading] = useState(Boolean(services?.auth));

  useEffect(() => {
    if (!services?.auth) {
      // Firebase が未設定なら loading を解除して終了
      setLoading(false);
      return;
    }

    // onAuthStateChanged はログイン・ログアウトのたびに呼ばれる。
    // アプリ起動時に一度呼ばれ、現在の認証状態を教えてくれる。
    // 戻り値の unsubscribe を return することで、
    // コンポーネントのアンマウント時にリスナーが自動解除される。
    const unsubscribe = onAuthStateChanged(services.auth, (nextUser) => {
      setUser(nextUser);   // null = ログアウト状態、User = ログイン済み
      setLoading(false);   // 認証状態が確定したので loading を解除
    });

    // cleanup 関数: コンポーネントのアンマウント時に購読を解除してメモリリークを防ぐ
    return unsubscribe;
  }, [services]); // services が変わったとき（設定変更）に再実行

  /**
   * Google でサインインする。
   * signInWithPopup はポップアップウィンドウで Google の認証画面を開く。
   * 成功すると onAuthStateChanged が呼ばれてユーザー状態が更新される。
   */
  async function signInWithGoogle() {
    if (!services?.auth) {
      throw new Error("Firebase が未設定です。");
    }

    // GoogleAuthProvider は OAuth2.0 の Google プロバイダー
    const provider = new GoogleAuthProvider();
    await signInWithPopup(services.auth, provider);
  }

  /**
   * サインアウトする。
   * signOut の完了後に onAuthStateChanged が呼ばれ user が null になる。
   */
  async function signOutUser() {
    if (!services?.auth) {
      return;
    }

    await signOut(services.auth);
  }

  return (
    // Context.Provider で value を提供。子コンポーネントは useAuth() で取り出せる。
    <AuthContext.Provider
      value={{
        user,
        loading,
        auth: services?.auth ?? null,
        firestore: services?.firestore ?? null,
        isConfigured: Boolean(services), // services が取得できていれば設定済みとみなす
        isAiConfigured: aiConfigured,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 認証コンテキストを取り出すカスタムフック。
 * Providers の外で呼ばれた場合はエラーをスローして開発時に気づけるようにする。
 *
 * 使い方:
 *   const { user, firestore, signInWithGoogle } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    // Provider の外で useAuth を呼んだ場合は即エラーにする（バグの早期発見）
    throw new Error("useAuth must be used inside Providers.");
  }

  return context;
}
