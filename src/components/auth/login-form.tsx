"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthApiError } from "@/lib/auth/auth-api";
import { useAuth } from "@/providers/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { status, error, signInWithLine } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationCode, setRegistrationCode] = useState("");

  async function handleLogin() {
    setIsSubmitting(true);
    try {
      await signInWithLine(registrationCode);
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

  const message = error?.message ?? (status === "configuration-error" ? "認証設定が未完了です。管理者に環境変数を確認してもらってください。" : null);
  const showRegistrationHelp =
    error instanceof AuthApiError &&
    ["registration-required", "invalid-registration-code", "registration-closed"].includes(error.code);

  return (
    <div>
      <label htmlFor="registration-code" className="mb-2 block text-sm font-medium text-slate-700">
        初回登録パスコード（未登録の人のみ）
      </label>
      <input
        id="registration-code"
        type="password"
        value={registrationCode}
        onChange={(event) => setRegistrationCode(event.target.value)}
        autoComplete="off"
        placeholder="管理者から受け取ったコード"
        className="mb-3 min-h-12 w-full border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-500"
      />
      <button
        type="button"
        onClick={handleLogin}
        disabled={isSubmitting || status === "configuration-error"}
        className="flex min-h-12 w-full items-center justify-center bg-[#06c755] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "ログイン中です…" : "LINEでログイン"}
      </button>
      {showRegistrationHelp ? (
        <p className="mt-2 text-xs leading-5 text-slate-600">
          すでに登録済みの人はパスコードなしでログインできます。初回登録の人はコードを入力して再度押してください。
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="mt-4 text-sm leading-6 text-[#8d3535]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
