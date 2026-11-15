"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { categorySchema, menuItemSchema } from "@/lib/validation";

export type AdminResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): AdminResult {
  return { ok: false, error: friendlyError(error) };
}

function refresh() {
  revalidatePath("/admin/mon");
  revalidatePath("/pos");
  revalidatePath("/admin");
}

const IMAGE_RE =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/menu-images\//i;

export async function saveMenuItemAction(input: unknown): Promise<AdminResult> {
  try {
    await assertAdmin();
    const parsed = menuItemSchema.safeParse(input);
    if (!parsed.success) return fail("INVALID_INPUT");

    const data = parsed.data;
    if (data.image_url && !IMAGE_RE.test(data.image_url)) {
      return { ok: false, error: "Ảnh phải được tải lên kho ảnh của quán." };
    }

    const supabase = await createClient();
    const payload = {
      category_id: data.category_id,
      name: data.name,
      description: data.description,
      price: data.price,
      image_url: data.image_url,
      is_active: data.is_active,
      sort_order: data.sort_order,
    };

    const { error } = data.id
      ? await supabase.from("menu_items").update(payload).eq("id", data.id)
      : await supabase.from("menu_items").insert(payload);

    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleMenuItemAction(
  id: string,
  isActive: boolean,
): Promise<AdminResult> {
  try {
    await assertAdmin();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const { error } = await supabase
      .from("menu_items")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMenuItemAction(id: string): Promise<AdminResult> {
  try {
    await assertAdmin();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveCategoryAction(input: unknown): Promise<AdminResult> {
  try {
    await assertAdmin();
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const { error } = parsed.data.id
      ? await supabase
          .from("categories")
          .update({ name: parsed.data.name, sort_order: parsed.data.sort_order })
          .eq("id", parsed.data.id)
      : await supabase
          .from("categories")
          .insert({ name: parsed.data.name, sort_order: parsed.data.sort_order });

    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCategoryAction(id: string): Promise<AdminResult> {
  try {
    await assertAdmin();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("INVALID_INPUT");

    const supabase = await createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
