export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="border border-dashed border-[var(--line)] px-5 py-10 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </section>
  );
}