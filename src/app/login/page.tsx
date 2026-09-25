import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10">
      <section className="w-full max-w-md border border-[var(--line)] bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.12em] text-[var(--accent)]">menchat</p>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">ログイン</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          LINEログインの設定が完了すると、許可された8人だけが利用できます。
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <Link
          href="/"
          className="mt-6 flex min-h-11 items-center justify-center border border-[var(--line)] text-sm font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          ホームへ戻る
        </Link>
      </section>
    </main>
  );
}