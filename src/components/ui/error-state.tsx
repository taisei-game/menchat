export function ErrorState({
  title = "読み込みに失敗しました",
  description = "通信環境を確認して、もう一度お試しください。",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <section role="alert" className="border border-[#e6caca] bg-[#fff8f8] px-5 py-6">
      <h2 className="font-semibold text-[#8d3535]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#805d5d]">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 bg-[#8d3535] px-5 text-sm font-semibold text-white hover:bg-[#702a2a]"
        >
          もう一度試す
        </button>
      ) : null}
    </section>
  );
}