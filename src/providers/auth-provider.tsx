"use client";

import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  getAuth,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getMissingPublicConfig, publicConfig } from "@/lib/config/public-config";
import { exchangeLineToken, type AuthApiError } from "@/lib/auth/auth-api";
import { getFirebaseApp } from "@/lib/firebase/client";
import { initializeLiff } from "@/lib/liff/client";
import { disablePushNotifications } from "@/lib/notifications/push";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "configuration-error" | "error";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  error: AuthApiError | Error | null;
  signInWithLine: (registrationCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasMissingConfig = getMissingPublicConfig().length > 0;
  const [status, setStatus] = useState<AuthStatus>(hasMissingConfig ? "configuration-error" : "loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<AuthApiError | Error | null>(null);

  useEffect(() => {
    if (hasMissingConfig) return;

    let unsubscribe: (() => void) | undefined;

    async function subscribeToAuthState() {
      try {
        const auth = getAuth(getFirebaseApp());
        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          setUser(nextUser);
          setStatus(nextUser ? "authenticated" : "unauthenticated");
        });
      } catch (authError) {
        setError(authError instanceof Error ? authError : new Error("認証の初期化に失敗しました。"));
        setStatus("error");
      }
    }

    void subscribeToAuthState();
    return () => unsubscribe?.();
  }, [hasMissingConfig]);

  async function signInWithLine(registrationCode?: string): Promise<void> {
    setError(null);
    setStatus("loading");

    try {
      await initializeLiff();
      const { default: liff } = await import("@line/liff");

      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      const idToken = liff.getIDToken();
      if (!idToken) {
        throw new Error("LINEのログイン情報を取得できませんでした。もう一度お試しください。");
      }

      const { customToken, displayName, pictureUrl } = await exchangeLineToken(idToken, registrationCode);
      const credential = await signInWithCustomToken(getAuth(getFirebaseApp()), customToken);
      if (displayName || pictureUrl) {
        try {
          await updateProfile(credential.user, { displayName, photoURL: pictureUrl });
        } catch {
          // Profile synchronization is best effort and must not invalidate a valid login.
        }
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError : new Error("ログインに失敗しました。"));
      setStatus("unauthenticated");
    }
  }

  async function signOut(): Promise<void> {
    const currentUser = getAuth(getFirebaseApp()).currentUser;
    if (currentUser) await disablePushNotifications(currentUser).catch(() => undefined);
    try {
      const { default: liff } = await import("@line/liff");
      if (liff.isLoggedIn()) liff.logout();
    } catch {
      // LIFF may not be initialized in an external browser.
    }
    await firebaseSignOut(getAuth(getFirebaseApp()));
    setUser(null);
    setStatus("unauthenticated");
  }

  return (
    <AuthContext.Provider value={{ status, user, error, signInWithLine, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthはAuthProviderの内側で使用してください。");
  return context;
}

export { publicConfig };