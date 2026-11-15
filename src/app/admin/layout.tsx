import Link from "next/link";
import { Coffee, LogOut, MonitorPlay } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { signOutAction } from "@/app/login/actions";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="print-hidden sticky top-0 hidden h-dvh flex-col border-r border-cream-200 bg-white px-5 py-8 lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-800 text-cream-50">
            <Coffee className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-semibold tracking-wide">
              POST Coffee
            </span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-mocha-400">
              Quản lý quán
            </span>
          </span>
        </Link>

        <AdminNav />

        <div className="mt-auto space-y-2 border-t border-cream-200 pt-4">
          <Link
            href="/pos"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-coffee-700 transition-colors hover:bg-cream-100"
          >
            <MonitorPlay className="h-4 w-4" />
            Màn hình bán hàng
          </Link>

          <div className="rounded-xl bg-cream-50 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-coffee-900">
              {profile.full_name || "Quản trị viên"}
            </p>
            <p className="truncate text-[11px] text-mocha-400">Quản trị viên</p>
            <form action={signOutAction} className="mt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-mocha-400 transition-colors hover:text-danger-500"
              >
                <LogOut className="h-3 w-3" /> Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="print-hidden sticky top-0 z-30 border-b border-cream-200 bg-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-coffee-800 text-cream-50">
                <Coffee className="h-3.5 w-3.5" />
              </span>
              <span className="font-display text-sm font-semibold">POST Coffee</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/pos"
                className="rounded-lg p-2 text-coffee-700 hover:bg-cream-100"
                aria-label="Màn hình bán hàng"
              >
                <MonitorPlay className="h-4 w-4" />
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg p-2 text-mocha-400 hover:bg-cream-100 hover:text-danger-500"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
          <div className="px-3 pb-2">
            <AdminNav variant="bar" />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
