import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10">
      <section className="w-full max-w-md border border-[#e6caca] bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.12em] text-[#8d3535]">ACCESS DENIED</p>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">利用できません</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          このアカウントはmenchatの利用対象として登録されていません。登録状況を管理者に確認してください。
        </p>
        <Link
          href="/login"
          className="mt-6 flex min-h-11 items-center justify-center bg-[var(--accent)] text-sm font-semibold text-white hover:bg-[#1b573b]"
        >
          ログイン画面へ戻る
        </Link>
      </section>
    </main>
  );
}