export default function OrderLoading() {
  return (
    <main className="pos-workspace" aria-busy="true" aria-label="Đang tải đơn hàng">
      <div className="pos-order-heading flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-cream-200" />
        <p role="status" className="text-sm text-mocha-400">Đang mở đơn và thực đơn…</p>
      </div>
      <div className="pos-columns">
        <section className="pos-browser animate-pulse">
          <div className="h-14 shrink-0 border-b border-cream-200 bg-white" />
          <div className="pos-menu-scroll space-y-3">
            <div className="h-11 rounded-lg bg-cream-200" />
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-20 rounded-lg border border-cream-200 bg-white" />)}
          </div>
        </section>
        <aside className="pos-bill mobile-closed animate-pulse">
          <div className="h-14 border-b border-cream-200" />
          <div className="flex-1" />
          <div className="space-y-3 border-t border-cream-200 p-4"><div className="h-6 rounded bg-cream-100" /><div className="h-12 rounded-lg bg-cream-200" /></div>
        </aside>
      </div>
    </main>
  );
}
