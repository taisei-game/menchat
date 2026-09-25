"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createThread, subscribeToThreads } from "@/lib/firestore/board";
import { threadInputSchema } from "@/lib/validation/domain";
import { useAuth } from "@/providers/auth-provider";
import type { BoardThread } from "@/types/domain";

export function BoardView() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<BoardThread[]>([]);
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    return subscribeToThreads(
      (nextThreads) => {
        setThreads(nextThreads);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        setErrorMessage("スレッドを読み込めませんでした。通信環境と権限を確認してください。");
      },
    );
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const parsed = threadInputSchema.safeParse({ title });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "スレッド名を確認してください。");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    try {
      await createThread(parsed.data, user);
      setTitle("");
    } catch {
      setErrorMessage("スレッドを作成できませんでした。時間を置いて再試行してください。");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-[var(--accent)]">話題を残す場所</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">掲示板</h1>
      </header>

      {errorMessage ? <p role="alert" className="border border-[#e6caca] bg-[#fff8f8] px-4 py-3 text-sm leading-6 text-[#8d3535]">{errorMessage}</p> : null}

      <form onSubmit={handleCreate} className="border border-[var(--line)] bg-white p-4">
        <label htmlFor="thread-title" className="text-sm font-semibold">新しいスレッド</label>
        <div className="mt-3 flex gap-2">
          <input id="thread-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="話題を入力" className="min-h-11 min-w-0 flex-1 border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          <button type="submit" disabled={isCreating || !title.trim()} className="min-h-11 bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isCreating ? "作成中" : "作成"}</button>
        </div>
      </form>

      <section className="space-y-2" aria-live="polite">
        {isLoading ? <p className="py-12 text-center text-sm text-[var(--muted)]">スレッドを読み込んでいます…</p> : null}
        {!isLoading && threads.length === 0 ? <p className="border border-dashed border-[var(--line)] px-5 py-10 text-center text-sm text-[var(--muted)]">まだスレッドがありません。</p> : null}
        {threads.map((thread) => (
          <Link key={thread.id} href={`/board/${thread.id}`} className="block border border-[var(--line)] bg-white px-4 py-4 hover:border-[var(--accent)]">
            <div className="flex items-start justify-between gap-4">
              <h2 className="min-w-0 break-words font-semibold">{thread.title}</h2>
              <span className="shrink-0 text-xs text-[var(--muted)]">{thread.replyCount}件</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}