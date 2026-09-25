export function LoadingState({ label = "読み込み中です" }: { label?: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-3 border border-[var(--line)] bg-white px-5 text-sm text-[var(--muted)]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}