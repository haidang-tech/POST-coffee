import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type SessionProfile = {
  userId: string;
  email: string | null;
  profile: Profile;
};

/** Trả về user + profile đang active, hoặc null nếu chưa đăng nhập / bị khoá. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  return { userId: user.id, email: user.email ?? null, profile };
}

/** Dùng trong layout/server component của khu vực cần đăng nhập. */
export async function requireStaff(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login?error=session");
  return session;
}

/** Chỉ admin. Staff vào sẽ bị đẩy về màn hình POS. */
export async function requireAdmin(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login?error=session");
  if (session.profile.role !== "admin") redirect("/pos");
  return session;
}

/** Dùng trong server action: ném lỗi thay vì redirect. */
export async function assertStaff(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function assertAdmin(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (session.profile.role !== "admin") throw new Error("FORBIDDEN");
  return session;
}
