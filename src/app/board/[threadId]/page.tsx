import { AppShell } from "@/components/layout/app-shell";
import { ThreadView } from "@/components/board/thread-view";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;

  return (
    <AppShell>
      <ThreadView threadId={threadId} />
    </AppShell>
  );
}