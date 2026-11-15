import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, MenuItem } from "@/lib/types";
import { MenuManager } from "./menu-manager";

export const dynamic = "force-dynamic";

export default async function MenuAdminPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase.from("categories").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .order("sort_order")
      .order("name"),
  ]);

  return (
    <MenuManager
      categories={(categoriesRes.data ?? []) as Category[]}
      items={(itemsRes.data ?? []) as MenuItem[]}
    />
  );
}
