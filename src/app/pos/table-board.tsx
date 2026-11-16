"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Area, CoffeeTable } from "@/lib/types";

export type BoardOrder = { id: string; table_id: string | null; table_label: string; code: string; total: number };
export type BoardData = { areas: Area[]; tables: CoffeeTable[]; openOrders: BoardOrder[] };
export function TableBoard({ areas, tables, openOrders, selectedId, onSelect, disabled = false }: BoardData & {
  selectedId?: string | null; onSelect: (table: CoffeeTable, openMenu: boolean) => void; disabled?: boolean;
}) {
  const router = useRouter();
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("all");
  const [openMenu, setOpenMenu] = useState(false);
  useEffect(() => {
    try {
      setArea(sessionStorage.getItem("pos-area") || "all");
      setStatus(sessionStorage.getItem("pos-status") || "all");
      setOpenMenu(sessionStorage.getItem("pos-open-menu") === "true");
    } catch { /* Storage is optional. */ }
  }, []);
  function remember(key: string, value: string) { try { sessionStorage.setItem(key, value); } catch { /* Storage is optional. */ } }
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = false;
    const schedule = () => {
      dirty = true; clearTimeout(timer);
      if (document.hidden || disabled) return;
      timer = setTimeout(() => { dirty = false; router.refresh(); }, 500);
    };
    const visible = () => { if (dirty) schedule(); };
    document.addEventListener("visibilitychange", visible);
    const channel = supabase.channel("pos-workspace")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, schedule).subscribe();
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visible); void supabase.removeChannel(channel); };
  }, [router, disabled]);
  const busy = (table: CoffeeTable) => table.status === "busy" || openOrders.some((order) => order.table_id === table.id);
  const areaTables = tables.filter((table) => area === "all" || table.area_id === area || (area === "none" && !table.area_id));
  const counts = { all: areaTables.length, busy: areaTables.filter(busy).length, empty: areaTables.filter((table) => !busy(table) && table.status === "empty").length };
  const visibleTables = areaTables.filter((table) => status === "all" || (status === "busy" ? busy(table) : !busy(table) && table.status === "empty"));
  const groups = [...areas, ...(tables.some((table) => !table.area_id) ? [{ id: "none", name: "Chưa phân khu", sort_order: 0 }] : [])];
  return <div className="pos-board">
    <div className="pos-area-tabs" aria-label="Khu vực">{[{ id: "all", name: "Tất cả khu vực" }, ...groups].map((entry) => <button key={entry.id} aria-pressed={area === entry.id} className={cn("pos-chip", area === entry.id && "active")} onClick={() => { setArea(entry.id); remember("pos-area", entry.id); }}>{entry.name}</button>)}</div>
    <div className="pos-filters">
      <div className="flex flex-wrap gap-2">{([{ id: "all", label: "Tất cả" }, { id: "busy", label: "Đang sử dụng" }, { id: "empty", label: "Còn trống" }] as const).map((entry) => <button key={entry.id} className={cn("pos-chip", status === entry.id && "active")} aria-pressed={status === entry.id} onClick={() => { setStatus(entry.id); remember("pos-status", entry.id); }}>{entry.label} <b>{counts[entry.id]}</b></button>)}</div>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={openMenu} onChange={(event) => { setOpenMenu(event.target.checked); remember("pos-open-menu", String(event.target.checked)); }} />Mở thực đơn khi chọn bàn</label>
    </div>
    <div className="pos-tables-scroll">
      {groups.map((group) => {
        const groupTables = visibleTables.filter((table) => group.id === "none" ? !table.area_id : table.area_id === group.id);
        if (!groupTables.length) return null;
        return <section key={group.id} className="mb-6"><h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{group.name}<span className="h-px flex-1 bg-slate-200" />{groupTables.length} bàn</h2>
          <div className="pos-table-grid">{groupTables.map((table) => <button key={table.id} disabled={disabled} aria-pressed={selectedId === table.id} onClick={() => onSelect(table, openMenu)} className={cn("pos-table", busy(table) && "busy", selectedId === table.id && "selected")} aria-label={`Bàn ${table.name}, ${busy(table) ? "đang sử dụng" : table.status === "reserved" ? "đã đặt" : "còn trống"}`}>
            {selectedId === table.id && <Check className="absolute right-2 top-2 h-4 w-4" />}
            <svg viewBox="0 0 80 54" fill="none" className="h-12 w-20" aria-hidden="true"><rect x="17" y="11" width="46" height="32" rx="7" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="2" /><path d="M26 6V3h12v3m6 0V3h12v3M26 48v3h12v-3m6 0v3h12v-3M11 19H7v16h4m58-16h4v16h-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
            <strong className="text-sm">{table.name}</strong><span className="text-[11px]">{busy(table) ? "Đang sử dụng" : table.status === "reserved" ? "Đã đặt" : "Còn trống"}</span><span className="flex items-center gap-1 text-[10px] opacity-70"><Users className="h-3 w-3" />{table.seats} chỗ</span>
          </button>)}</div></section>;
      })}
      {!visibleTables.length && <p className="py-16 text-center text-sm text-slate-500">{tables.length ? "Không có bàn phù hợp bộ lọc." : "Chưa có bàn. Thêm bàn trong mục Quản lý."}</p>}
    </div>
  </div>;
}
