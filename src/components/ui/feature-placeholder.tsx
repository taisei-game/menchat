import Link from "next/link";

export function FeaturePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="border border-dashed border-[var(--line)] bg-white px-5 py-12 text-center sm:px-10">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent)]">NEXT STEP</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">{description}</p>
      <Link
        href="/"
        className="mt-7 inline-flex min-h-11 items-center justify-center bg-[var(--accent)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1b573b]"
      >
        ホームへ戻る
      </Link>
    </section>
  );
}