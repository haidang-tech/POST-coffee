"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createStaffSchema, memberSchema } from "@/lib/validation";

export type AdminResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): AdminResult {
  return { ok: false, error: friendlyError(error) };
}

export async function createStaffAction(input: unknown): Promise<AdminResult> {
  try {
    await assertAdmin();
    const parsed = createStaffSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? friendlyError("INVALID_INPUT"),
      };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return { ok: false, error: "Email này đã có tài khoản." };
      }
      return { ok: false, error: "Không tạo được tài khoản. Kiểm tra lại thông tin." };
    }

    revalidatePath("/admin/nhan-vien");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateMemberAction(input: unknown): Promise<AdminResult> {
  try {
    const session = await assertAdmin();
    const parsed = memberSchema.safeParse(input);
    if (!parsed.success) return fail("INVALID_INPUT");

    if (parsed.data.user_id === session.userId) {
      return { ok: false, error: "Không thể tự đổi quyền của chính mình." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_set_member", {
      p_user_id: parsed.data.user_id,
      p_role: parsed.data.role,
      p_is_active: parsed.data.is_active,
    });
    if (error) return fail(error.message);

    revalidatePath("/admin/nhan-vien");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
