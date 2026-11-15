export default function OrderLoading() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cream-200" />
          <div className="space-y-2">
            <div className="h-2.5 w-32 rounded bg-cream-200" />
            <div className="h-6 w-40 rounded bg-cream-200" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <div className="h-24 rounded-2xl border border-cream-200 bg-white" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 rounded-xl border border-cream-200 bg-white"
              />
            ))}
          </div>
        </div>
        <div className="hidden h-[70dvh] rounded-2xl border border-cream-200 bg-white lg:block" />
      </div>
    </main>
  );
}
