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
      .select("id, code, table_id, total, created_at, order_items(id)")
      .eq("status", "open")
      .order("created_at"),
  ]);

  const openOrders = (ordersRes.data ?? []).map((row) => {
    const items = (row.order_items ?? []) as { id: string }[];
    return {
      id: row.id as string,
      code: row.code as string,
      table_id: row.table_id as string | null,
      total: row.total as number,
      created_at: row.created_at as string,
      itemCount: items.length,
    };
  });

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
