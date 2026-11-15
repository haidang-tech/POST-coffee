import Link from "next/link";
import { Coffee, LayoutDashboard, LogOut } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { signOutAction } from "@/app/login/actions";
import { LiveClock } from "@/components/pos/live-clock";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireStaff();

  return (
    <div className="min-h-dvh">
      <header className="print-hidden sticky top-0 z-30 border-b border-cream-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/pos" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-800 text-cream-50">
              <Coffee className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-semibold tracking-wide text-coffee-900">
                POST Coffee
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-mocha-400">
                Sơ đồ bàn &amp; gọi món
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-coffee-800">
                {profile.full_name || "Nhân viên"}
              </p>
              <p className="text-[11px] text-mocha-400">
                {profile.role === "admin" ? "Quản trị viên" : "Nhân viên"}
              </p>
            </div>
            <LiveClock />
            {profile.role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cream-100 px-3 text-xs font-semibold text-coffee-700 transition-colors hover:bg-cream-200"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Quản lý
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-mocha-400 transition-colors hover:bg-cream-100 hover:text-danger-500"
                title="Đăng xuất"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
