"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, ReceiptText, Plus, X, Search } from "lucide-react";
import { PosBrowser } from "./pos-browser";
import type { BoardData } from "./table-board";
import type { MenuItem, CoffeeTable } from "@/lib/types";
import { openTableAction } from "./actions";
import { searchText } from "@/lib/order-preview";
import { vnd } from "@/lib/utils";

export function EmptyWorkspace({ data, menuItems, initialTableId, initialView }: { data: BoardData; menuItems: MenuItem[]; initialTableId?: string; initialView?: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialTableId);
  const [view, setView] = useState(initialView === "menu" ? "menu" : "tables");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const table = data.tables.find((entry) => entry.id === selectedId);
  function select(entry: CoffeeTable, openMenu: boolean) {
    const order = data.openOrders.find((order) => order.table_id === entry.id);
    if (order) { startTransition(() => router.push(`/pos/ban/${order.id}${openMenu ? "?view=menu" : ""}`)); return; }
    setSelectedId(entry.id); setError("");
    if (openMenu) setView("menu");
  }
  function open() {
    if (!table || pending) return;
    startTransition(async () => {
      const result = await openTableAction(table.id);
      setError(result.error);
    });
  }
  return <main className="pos-workspace"><div className="pos-columns pos-empty-columns">
    <PosBrowser data={data} selectedId={selectedId} disabled={pending} view={view} onView={setView} onSelect={select} menu={<div>
      <label className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><Search className="h-4 w-4 text-slate-400" /><input className="h-11 min-w-0 flex-1 text-sm" placeholder="Tìm món trong thực đơn" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <p className="mb-4 text-xs text-slate-500">Chọn bàn và mở đơn để bắt đầu thêm món.</p>
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">{menuItems.filter((item) => searchText(item.name).includes(searchText(query))).map((item) => <div key={item.id} className="flex min-h-16 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        {item.image_url ? <Image src={item.image_url} alt="" width={56} height={56} sizes="56px" className="h-14 w-14 shrink-0 rounded-md object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400"><BookOpen className="h-4 w-4" /></span>}
        <span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.name}</span>{item.description ? <span className="block truncate text-xs text-slate-500">{item.description}</span> : null}</span>
        <b className="shrink-0">{vnd(item.price)}</b>
      </div>)}</div>
    </div>} />
    <aside className="pos-empty-bill">
      <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4"><h1 className="font-semibold">{table ? `Bàn ${table.name}` : "Đơn hiện tại"}</h1>{table && <button className="flex h-11 w-11 items-center justify-center" aria-label="Bỏ chọn bàn" disabled={pending} onClick={() => setSelectedId(undefined)}><X className="h-4 w-4" /></button>}</div>
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="mb-4 rounded-full bg-blue-50 p-5 text-blue-500"><ReceiptText className="h-8 w-8" /></span><h2 className="text-lg font-semibold">{table ? "Sẵn sàng mở đơn" : "Chọn bàn để bắt đầu"}</h2><p className="mt-2 max-w-64 text-sm leading-6 text-slate-500">{table ? `${table.name} · ${table.seats} chỗ. Nhấn mở đơn để gọi món cho bàn này.` : "Chọn một bàn trên sơ đồ để xem đơn hoặc bắt đầu phục vụ."}</p></div>
      <div className="border-t border-slate-200 p-4">{error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}<button className="pos-primary w-full" disabled={!table || pending} onClick={open}><Plus className="h-4 w-4" />{pending ? "Đang mở…" : "Mở đơn & gọi món"}</button></div>
    </aside>
  </div></main>;
}
