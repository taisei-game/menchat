import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <p className="text-sm font-medium text-[var(--accent)]">おかえりなさい</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">みんなの場所</h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--muted)]">
            8人だけで使う、静かなコミュニケーションスペースです。
          </p>
        </section>

        <section className="border border-[var(--line)] bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">STATUS</p>
              <h2 className="mt-2 text-lg font-semibold">開発準備中です</h2>
            </div>
            <span className="h-3 w-3 rounded-full bg-[#e3a847]" aria-label="準備中" />
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            認証とデータ接続の設定が完了すると、ここから各機能を利用できるようになります。
          </p>
        </section>

        <section>
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold">行き先</h2>
            <span className="text-xs text-[var(--muted)]">5つの機能</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ["トーク", "みんなとの会話", "/talk"],
              ["掲示板", "話題を残す場所", "/board"],
              ["ショート", "現在作業中です", "/shorts"],
              ["設定", "プロフィールと環境", "/settings"],
            ].map(([title, description, href]) => (
              <Link
                key={href}
                href={href}
                className="group border border-[var(--line)] bg-white p-4 transition-colors hover:border-[var(--accent)]"
              >
                <span className="text-base font-semibold group-hover:text-[var(--accent)]">{title}</span>
                <span className="mt-1 block text-sm text-[var(--muted)]">{description}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
