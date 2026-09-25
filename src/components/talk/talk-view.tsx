"use client";

import { useEffect, useState } from "react";

import { deleteTalkMessage, createTalkMessage, subscribeToTalkMessages } from "@/lib/firestore/talk";
import { dispatchNotification } from "@/lib/notifications/push";
import { messageInputSchema } from "@/lib/validation/domain";
import { useAuth } from "@/providers/auth-provider";
import type { PostMode, TalkMessage } from "@/types/domain";

function formatMessageTime(date: Date | null): string {
  return date ? new Intl.DateTimeFormat("ja-JP", { hour: "numeric", minute: "2-digit" }).format(date) : "送信中";
}

export function TalkView() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [body, setBody] = useState("");
  const [postMode, setPostMode] = useState<PostMode>("anonymous");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToTalkMessages(
      (nextMessages) => {
        setMessages(nextMessages);
        setIsLoading(false);
        setErrorMessage(null);
      },
      () => {
        setIsLoading(false);
        setErrorMessage("トークを読み込めませんでした。通信環境と権限を確認してください。");
      },
    );

    return unsubscribe;
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setErrorMessage("ログイン状態を確認できません。いったんログインし直してください。");
      return;
    }

    const parsed = messageInputSchema.safeParse({ body, postMode });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "メッセージを確認してください。");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const messageId = await createTalkMessage(parsed.data, user);
      void dispatchNotification(user, { category: "talk", documentId: messageId }).catch(() => undefined);
      setBody("");
    } catch {
      setErrorMessage("メッセージを送信できませんでした。通信環境と入力内容を確認してください。");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    try {
      await deleteTalkMessage(messageId);
    } catch {
      setErrorMessage("メッセージを削除できませんでした。時間を置いて再試行してください。");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-[var(--accent)]">みんなの会話</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">トーク</h1>
      </header>

      {errorMessage ? <p role="alert" className="border border-[#e6caca] bg-[#fff8f8] px-4 py-3 text-sm leading-6 text-[#8d3535]">{errorMessage}</p> : null}

      <section aria-live="polite" className="min-h-[45vh] border border-[var(--line)] bg-white p-4 sm:p-6">
        {isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">メッセージを読み込んでいます…</p>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">まだメッセージがありません。最初の一言を送ってみましょう。</p>
        ) : (
          <div className="space-y-4">
            {[...messages].reverse().map((message) => {
              const isMine = message.authorUid === user?.uid;

              return (
                <article key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${isMine ? "items-end" : "items-start"}`}>
                    <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                      <span>{message.postMode === "anonymous" ? "匿名" : message.displayName}</span>
                      <time dateTime={message.createdAt?.toISOString()}>{formatMessageTime(message.createdAt)}</time>
                    </div>
                    <div className={`whitespace-pre-wrap break-words px-4 py-3 text-sm leading-6 ${isMine ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--foreground)]"}`}>
                      {message.body}
                    </div>
                    {isMine ? (
                      <button type="button" onClick={() => handleDelete(message.id)} className="mt-1 text-xs text-[var(--muted)] hover:text-[#8d3535]">
                        削除
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="sticky bottom-24 border border-[var(--line)] bg-white p-3 shadow-sm sm:bottom-4">
        <label htmlFor="talk-message" className="sr-only">メッセージ</label>
        <textarea
          id="talk-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="メッセージを入力"
          rows={2}
          maxLength={2_000}
          className="w-full resize-none border-0 bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-[var(--muted)]"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1" aria-label="投稿形式">
            {(["anonymous", "named"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPostMode(mode)}
                aria-pressed={postMode === mode}
                className={`min-h-9 px-3 text-xs font-medium ${postMode === mode ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--background)]"}`}
              >
                {mode === "anonymous" ? "匿名" : "名前を表示"}
              </button>
            ))}
          </div>
          <button type="submit" disabled={isSending || !body.trim()} className="min-h-10 bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
            {isSending ? "送信中" : "送信"}
          </button>
        </div>
      </form>
    </div>
  );
}