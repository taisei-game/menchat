"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("menchatで予期しないエラーが発生しました", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10">
      <div className="w-full max-w-md">
        <ErrorState
          title="画面の表示に失敗しました"
          description="一時的な問題の可能性があります。再試行しても解決しない場合は、時間を置いてお試しください。"
          onRetry={reset}
        />
      </div>
    </main>
  );
}