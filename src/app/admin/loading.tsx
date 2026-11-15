export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded bg-cream-200" />
      <div className="mt-2 h-8 w-40 rounded bg-cream-200" />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-cream-200 bg-white"
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="h-72 rounded-2xl border border-cream-200 bg-white" />
        <div className="h-72 rounded-2xl border border-cream-200 bg-white" />
      </div>

      <div className="mt-4 h-64 rounded-2xl border border-cream-200 bg-white" />
    </div>
  );
}
