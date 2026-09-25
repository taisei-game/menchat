"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/providers/auth-provider";

const navigation = [
  { href: "/", label: "ホーム" },
  { href: "/talk", label: "トーク" },
  { href: "/board", label: "掲示板" },
  { href: "/shorts", label: "ショート" },
  { href: "/settings", label: "設定" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, error } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return <LoadingState label="menchatを準備しています" />;
  }

  if (status === "configuration-error") {
    return <ErrorState title="menchatの設定が未完了です" description="管理者が認証設定を完了するまで、この画面は利用できません。" />;
  }

  if (status === "error") {
    return <ErrorState title="認証状態を確認できません" description={error?.message ?? "通信環境を確認して、もう一度お試しください。"} />;
  }

  if (status === "unauthenticated") {
    return <LoadingState label="ログイン画面へ移動しています" />;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-[var(--background)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-[0.08em] text-[var(--accent)]">
          menchat
        </Link>
        <span className="text-xs font-medium tracking-[0.12em] text-[var(--muted)]">PRIVATE · 8</span>
      </header>

      <main className="flex-1 px-5 pb-28 pt-7 sm:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--line)] bg-white/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:absolute sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
          {navigation.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center rounded-xl px-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}