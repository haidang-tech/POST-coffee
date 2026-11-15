"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { areaSchema, tableSchema } from "@/lib/validation";

export type AdminResult = { ok: true } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: unknown): AdminResult {
  return { ok: false, error: friendlyError(error) };
}

function refresh() {
  revalidatePath("/admin/ban");
  revalidatePath("/pos");
  revalidatePath("/admin");
}

export async function saveAreaAction(input: unknown): Promise<AdminResult> {
  try {
    await assertAdmin();
    const parsed = areaSchema.safeParse(input);
    if (!parsed.success) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const { error } = parsed.data.id
      ? await supabase
          .from("areas")
          .update({ name: parsed.data.name, sort_order: parsed.data.sort_order })
          .eq("id", parsed.data.id)
      : await supabase.from("areas").insert({
          name: parsed.data.name,
          sort_order: parsed.data.sort_order,
        });

    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAreaAction(id: string): Promise<AdminResult> {
  try {
    await assertAdmin();
    if (!UUID_RE.test(id)) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const { count } = await supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("area_id", id);

    if ((count ?? 0) > 0) {
      return { ok: false, error: "Khu vực còn bàn. Hãy chuyển hoặc xoá bàn trước." };
    }

    const { error } = await supabase.from("areas").delete().eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveTableAction(input: unknown): Promise<AdminResult> {
  try {
    await assertAdmin();
    const parsed = tableSchema.safeParse(input);
    if (!parsed.success) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const payload = {
      area_id: parsed.data.area_id,
      name: parsed.data.name,
      seats: parsed.data.seats,
      is_active: parsed.data.is_active,
    };

    if (parsed.data.id) {
      const { error } = await supabase
        .from("tables")
        .update(payload)
        .eq("id", parsed.data.id);
      if (error) return fail(error.message);

      // Giữ nhãn bàn trên các đơn đang mở đồng bộ với tên mới (RLS chặn ghi
      // trực tiếp vào orders nên phải qua RPC).
      await supabase.rpc("admin_sync_table_label", {
        p_table_id: parsed.data.id,
      });
    } else {
      const { error } = await supabase.from("tables").insert(payload);
      if (error) return fail(error.message);
    }

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteTableAction(id: string): Promise<AdminResult> {
  try {
    await assertAdmin();
    if (!UUID_RE.test(id)) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("table_id", id)
      .eq("status", "open");

    if ((count ?? 0) > 0) {
      return { ok: false, error: "Bàn đang có đơn mở. Hãy thanh toán hoặc huỷ đơn trước." };
    }

    const { error } = await supabase.from("tables").delete().eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setTableStatusAction(
  id: string,
  status: "empty" | "reserved",
): Promise<AdminResult> {
  try {
    await assertAdmin();
    if (!UUID_RE.test(id)) return fail("INVALID_INPUT");
    if (!["empty", "reserved"].includes(status)) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_set_table_status", {
      p_table_id: id,
      p_status: status,
    });
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
