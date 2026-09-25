"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createPost, deletePost, subscribeToPosts, subscribeToThread } from "@/lib/firestore/board";
import { dispatchNotification } from "@/lib/notifications/push";
import { postInputSchema } from "@/lib/validation/domain";
import { useAuth } from "@/providers/auth-provider";
import type { BoardPost, BoardThread, PostMode } from "@/types/domain";

export function ThreadView({ threadId }: { threadId: string }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [thread, setThread] = useState<BoardThread | null>(null);
  const [body, setBody] = useState("");
  const [postMode, setPostMode] = useState<PostMode>("anonymous");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeThread = subscribeToThread(threadId, setThread, () => setErrorMessage("スレッドを読み込めませんでした。通信環境と権限を確認してください。"));
    const unsubscribePosts = subscribeToPosts(
      threadId,
      (nextPosts) => {
        setPosts(nextPosts);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        setErrorMessage("投稿を読み込めませんでした。通信環境と権限を確認してください。");
      },
    );
    return () => {
      unsubscribeThread();
      unsubscribePosts();
    };
  }, [threadId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const parsed = postInputSchema.safeParse({ body, postMode });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "本文を確認してください。");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    try {
      const postId = await createPost(threadId, parsed.data, user);
      void dispatchNotification(user, { category: "board", documentId: postId, threadId }).catch(() => undefined);
      setBody("");
    } catch {
      setErrorMessage("投稿できませんでした。時間を置いて再試行してください。");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(postId: string) {
    try {
      await deletePost(threadId, postId);
    } catch {
      setErrorMessage("投稿を削除できませんでした。時間を置いて再試行してください。");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <Link href="/board" className="text-sm font-medium text-[var(--accent)]">← 掲示板へ戻る</Link>
        <h1 className="mt-4 break-words text-2xl font-semibold tracking-tight">{thread?.title ?? "スレッド"}</h1>
      </header>

      {errorMessage ? <p role="alert" className="border border-[#e6caca] bg-[#fff8f8] px-4 py-3 text-sm leading-6 text-[#8d3535]">{errorMessage}</p> : null}

      <section className="space-y-3" aria-live="polite">
        {isLoading ? <p className="py-12 text-center text-sm text-[var(--muted)]">投稿を読み込んでいます…</p> : null}
        {!isLoading && posts.length === 0 ? <p className="border border-dashed border-[var(--line)] px-5 py-10 text-center text-sm text-[var(--muted)]">まだ投稿がありません。</p> : null}
        {posts.map((post) => {
          const isMine = post.authorUid === user?.uid;
          return (
            <article key={post.id} className="border border-[var(--line)] bg-white p-4">
              <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                <span className="font-semibold text-[var(--accent)]">{post.number} ： {post.postMode === "anonymous" ? "匿名" : post.displayName}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{post.body}</p>
              {isMine ? <button type="button" onClick={() => handleDelete(post.id)} className="mt-3 text-xs text-[var(--muted)] hover:text-[#8d3535]">削除</button> : null}
            </article>
          );
        })}
      </section>

      <form onSubmit={handleSubmit} className="border border-[var(--line)] bg-white p-4">
        <label htmlFor="post-body" className="sr-only">返信本文</label>
        <textarea id="post-body" value={body} onChange={(event) => setBody(event.target.value)} rows={4} maxLength={2_000} placeholder="返信を書く" className="w-full resize-y border border-[var(--line)] p-3 text-sm leading-6 outline-none focus:border-[var(--accent)]" />
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(["anonymous", "named"] as const).map((mode) => <button key={mode} type="button" onClick={() => setPostMode(mode)} aria-pressed={postMode === mode} className={`min-h-9 px-3 text-xs font-medium ${postMode === mode ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}>{mode === "anonymous" ? "匿名" : "名前を表示"}</button>)}
          </div>
          <button type="submit" disabled={isSending || !body.trim()} className="min-h-10 bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isSending ? "投稿中" : "投稿"}</button>
        </div>
      </form>
    </div>
  );
}