import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Area, CoffeeTable } from "@/lib/types";
import { TableBoard } from "./table-board";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  await requireStaff();
  const supabase = await createClient();

  const [areasRes, tablesRes, ordersRes] = await Promise.all([
    supabase.from("areas").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("tables")
      .select("id, area_id, name, seats, status, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("orders")
      .select("id, table_id")
      .eq("status", "open"),
  ]);

  const openOrders = (ordersRes.data ?? []).map((row) => ({
    id: row.id,
    table_id: row.table_id,
  }));

  return (
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
      <TableBoard
        areas={(areasRes.data ?? []) as Area[]}
        tables={(tablesRes.data ?? []) as CoffeeTable[]}
        openOrders={openOrders}
      />
    </main>
  );
}
