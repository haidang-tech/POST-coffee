"use client";

import { useActionState } from "react";
import { Coffee, Loader2, LockKeyhole, Mail } from "lucide-react";
import { signInAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signInAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-semibold text-coffee-700"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha-400" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="ten@postcoffee.vn"
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold text-coffee-700"
        >
          Mật khẩu
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha-400" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            placeholder="••••••••"
            className="pl-10"
          />
        </div>
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-500/20 bg-danger-500/8 px-3.5 py-2.5 text-xs font-medium text-danger-500"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập…
          </>
        ) : (
          "Đăng nhập"
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-mocha-400">
        <Coffee className="h-3.5 w-3.5" />
        Tài khoản do quản trị viên quán cấp.
      </p>
    </form>
  );
}
