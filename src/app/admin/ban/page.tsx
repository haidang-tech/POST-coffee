import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Area, CoffeeTable } from "@/lib/types";
import { TablesManager } from "./tables-manager";

export const dynamic = "force-dynamic";

export default async function TablesAdminPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [areasRes, tablesRes] = await Promise.all([
    supabase.from("areas").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("tables")
      .select("id, area_id, name, seats, status, is_active")
      .order("name"),
  ]);

  return (
    <TablesManager
      areas={(areasRes.data ?? []) as Area[]}
      tables={(tablesRes.data ?? []) as CoffeeTable[]}
    />
  );
}
