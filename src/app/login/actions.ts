"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export type LoginState = { error?: string } | null;

export async function signInAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const headerList = await headers();
  const limited = rateLimit(clientKey(headerList, "login"), 8, 60_000);
  if (!limited.ok) return { error: friendlyError("TOO_MANY_ATTEMPTS") };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? friendlyError("INVALID_INPUT") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendlyError(error.message) };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return {
      error: "Tài khoản chưa được cấp quyền hoặc đã bị khoá. Liên hệ quản trị viên.",
    };
  }

  redirect(profile.role === "admin" ? "/admin" : "/pos");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
