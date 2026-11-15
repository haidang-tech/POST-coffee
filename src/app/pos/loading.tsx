export default function PosLoading() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-4 py-6 sm:px-6 sm:py-8">
      <div className="h-3 w-24 rounded bg-cream-200" />
      <div className="mt-2 h-8 w-48 rounded bg-cream-200" />

      <div className="mt-6 space-y-8">
        {[0, 1].map((group) => (
          <div key={group}>
            <div className="mb-3 h-3 w-32 rounded bg-cream-200" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-2xl border border-cream-200 bg-white"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
