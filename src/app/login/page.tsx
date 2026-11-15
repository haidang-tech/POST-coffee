import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-coffee-800 px-12 py-14 text-cream-50 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-mocha-400/20 blur-3xl"
        />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-accent-500">
            Since 2024
          </p>
          <h1 className="mt-5 font-display text-7xl leading-[0.95] text-cream-50">
            POST
            <br />
            Coffee
          </h1>
        </div>

        <div className="relative max-w-md">
          <p className="text-lg leading-relaxed text-cream-100/90">
            Một chỗ ngồi thật êm, một ly cà phê thật chậm và những cuộc trò
            chuyện không vội.
          </p>
          <div className="mt-8 flex items-center gap-3 text-xs text-cream-200/70">
            <span className="h-px w-12 bg-cream-200/40" />
            Hệ thống vận hành nội bộ
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-500">
              POST Coffee
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Đăng nhập quản lý</h1>
          </div>

          <div className="mb-7 hidden lg:block">
            <h2 className="text-3xl font-semibold text-coffee-900">
              Chào buổi sáng
            </h2>
            <p className="mt-1.5 text-sm text-mocha-400">
              Đăng nhập để vào ca làm việc của bạn.
            </p>
          </div>

          {error === "session" ? (
            <p className="mb-4 rounded-xl border border-warning-500/25 bg-warning-500/10 px-3.5 py-2.5 text-xs font-medium text-[#8a6110]">
              Phiên đăng nhập đã hết hoặc tài khoản bị khoá. Vui lòng đăng nhập
              lại.
            </p>
          ) : null}

          <LoginForm />

          <p className="mt-10 text-center text-[11px] leading-relaxed text-mocha-400">
            POST Coffee · Ứng dụng nội bộ
            <br />
            Mọi thao tác đều được ghi nhật ký.
          </p>
        </div>
      </section>
    </main>
  );
}
