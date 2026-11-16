import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MenuItem } from "@/lib/types";
import { loadBoardData } from "./board-data";
import { EmptyWorkspace } from "./empty-workspace";
export const dynamic = "force-dynamic";
export default async function PosPage({ searchParams }: { searchParams: Promise<{ table?: string; view?: string }> }) {
  await requireStaff();
  const db = await createClient();
  const [data, menu, params] = await Promise.all([loadBoardData(), db.from("menu_items").select("*").eq("is_active", true).order("sort_order").order("name"), searchParams]);
  if (menu.error) throw new Error("Không tải được thực đơn. Vui lòng thử lại.");
  return <EmptyWorkspace key={`${params.table ?? "none"}-${params.view ?? "tables"}`} data={data} menuItems={(menu.data ?? []) as MenuItem[]} initialTableId={params.table} initialView={params.view} />;
}
