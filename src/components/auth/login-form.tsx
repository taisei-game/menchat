"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthApiError } from "@/lib/auth/auth-api";
import { useAuth } from "@/providers/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { status, error, signInWithLine } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    setIsSubmitting(true);
    try {
      await signInWithLine();
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
      return;
    }

    if (error instanceof AuthApiError && error.code === "unauthorized") {
      router.replace("/unauthorized");
    }
  }, [error, router, status]);

  const message =
    error?.message ??
    (status === "configuration-error"
      ? "認証設定が未完了です。管理者に環境変数を確認してもらってください。"
      : null);

  return (
    <div>
      <button
        type="button"
        onClick={handleLogin}
        disabled={isSubmitting || status === "configuration-error"}
        className="flex min-h-12 w-full items-center justify-center bg-[#06c755] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "ログイン中です…" : "LINEでログイン"}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-[var(--muted)]">
        登録済みのメンバーのみ利用できます。
      </p>
      {message ? (
        <p role="alert" className="mt-4 text-sm leading-6 text-[#8d3535]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
