import { createClient } from "@/lib/supabase/server";
import type { BoardData } from "./table-board";

export async function loadBoardData(): Promise<BoardData> {
  const db = await createClient();
  const [areas, tables, orders] = await Promise.all([
    db.from("areas").select("id, name, sort_order").order("sort_order"),
    db.from("tables").select("id, area_id, name, seats, status, is_active").eq("is_active", true).order("name"),
    db.from("orders").select("id, table_id, table_label, code, total").eq("status", "open").order("created_at"),
  ]);
  if (areas.error || tables.error || orders.error) throw new Error("Không tải được sơ đồ bàn. Vui lòng thử lại.");
  return { areas: areas.data ?? [], tables: tables.data ?? [], openOrders: orders.data ?? [] } as BoardData;
}
