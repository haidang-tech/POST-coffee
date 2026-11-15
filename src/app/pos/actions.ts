"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

export type ActionResult = { ok: true } | { ok: false; error: string };

function invalid(): ActionResult {
  return { ok: false, error: friendlyError("INVALID_INPUT") };
}

function refresh() {
  revalidatePath("/pos");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}

export async function openTableAction(
  tableId: string,
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  try {
    await assertStaff();
    if (!uuid.safeParse(tableId).success) return { ok: false, error: friendlyError("INVALID_INPUT") };

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("pos_create_order", {
      p_table_id: tableId,
      p_note: "",
    });

    if (error) return { ok: false, error: friendlyError(error.message) };
    refresh();
    return { ok: true, orderId: (data as { id: string }).id };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function setTableStatusAction(
  tableId: string,
  status: "empty" | "reserved",
): Promise<ActionResult> {
  try {
    await assertStaff();
    if (!uuid.safeParse(tableId).success) return invalid();
    if (!["empty", "reserved"].includes(status)) return invalid();

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_set_table_status", {
      p_table_id: tableId,
      p_status: status,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function addItemAction(
  orderId: string,
  menuItemId: string,
  qty = 1,
  note = "",
): Promise<ActionResult> {
  try {
    await assertStaff();
    if (!uuid.safeParse(orderId).success || !uuid.safeParse(menuItemId).success)
      return invalid();
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return invalid();
    if (typeof note !== "string" || note.length > 200) return invalid();

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_add_item", {
      p_order_id: orderId,
      p_menu_item_id: menuItemId,
      p_qty: qty,
      p_note: note.trim(),
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    revalidatePath(`/pos/ban/${orderId}`);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function updateItemQtyAction(
  orderId: string,
  itemId: string,
  qty: number,
): Promise<ActionResult> {
  try {
    await assertStaff();
    if (!uuid.safeParse(orderId).success || !uuid.safeParse(itemId).success)
      return invalid();
    if (!Number.isInteger(qty) || qty < 0 || qty > 99) return invalid();

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_update_item", {
      p_item_id: itemId,
      p_qty: qty,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    revalidatePath(`/pos/ban/${orderId}`);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function payOrderAction(
  orderId: string,
  discount: number,
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  try {
    await assertStaff();
    if (!uuid.safeParse(orderId).success)
      return { ok: false, error: friendlyError("INVALID_INPUT") };
    if (!Number.isInteger(discount) || discount < 0 || discount > 100_000_000)
      return { ok: false, error: friendlyError("INVALID_INPUT") };

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_pay_order", {
      p_order_id: orderId,
      p_discount: discount,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    refresh();
    revalidatePath(`/pos/ban/${orderId}`);
    return { ok: true, orderId };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function moveOrderAction(
  orderId: string,
  tableId: string,
): Promise<ActionResult> {
  try {
    await assertStaff();
    if (!uuid.safeParse(orderId).success || !uuid.safeParse(tableId).success)
      return invalid();

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_move_order", {
      p_order_id: orderId,
      p_table_id: tableId,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    revalidatePath(`/pos/ban/${orderId}`);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function mergeOrdersAction(
  sourceId: string,
  targetId: string,
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  try {
    await assertStaff();
    if (!uuid.safeParse(sourceId).success || !uuid.safeParse(targetId).success)
      return { ok: false, error: friendlyError("INVALID_INPUT") };

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_merge_orders", {
      p_source_id: sourceId,
      p_target_id: targetId,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    refresh();
    return { ok: true, orderId: targetId };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function setItemNoteAction(
  orderId: string,
  itemId: string,
  note: string,
): Promise<ActionResult> {
  try {
    await assertStaff();
    if (!uuid.safeParse(orderId).success || !uuid.safeParse(itemId).success)
      return invalid();
    if (typeof note !== "string" || note.length > 200) return invalid();

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_set_item_note", {
      p_item_id: itemId,
      p_note: note.trim(),
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    revalidatePath(`/pos/ban/${orderId}`);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {  try {
    await assertStaff();
    if (!uuid.safeParse(orderId).success) return invalid();

    const supabase = await createClient();
    const { error } = await supabase.rpc("pos_cancel_order", {
      p_order_id: orderId,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}
