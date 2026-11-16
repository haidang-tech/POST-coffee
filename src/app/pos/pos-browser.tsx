"use client";
import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Armchair, BookOpen, ReceiptText } from "lucide-react";
import { TableBoard, type BoardData } from "./table-board";
import type { CoffeeTable } from "@/lib/types";
import { vnd } from "@/lib/utils";

export function PosBrowser({ data, selectedId, menu, disabled, onSelect, view, onView }: {
  data: BoardData; selectedId?: string | null; menu: ReactNode; disabled?: boolean;
  onSelect: (table: CoffeeTable, openMenu: boolean) => void;
  view?: string; onView?: (view: string) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [localView, setLocalView] = useState(params.get("view") === "menu" ? "menu" : "tables");
  const current = view ?? localView;
  const selectView = onView ?? setLocalView;
  return <section className="pos-browser">
    <nav className="pos-main-tabs" aria-label="Bán hàng">
      {[{ id: "tables", label: "Phòng bàn", icon: Armchair }, { id: "menu", label: "Thực đơn", icon: BookOpen }, { id: "orders", label: `Đơn đang mở (${data.openOrders.length})`, icon: ReceiptText }].map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={current === id} onClick={() => selectView(id)}><Icon className="h-4 w-4" />{label}</button>)}
    </nav>
    <div className={current === "tables" ? "pos-browser-body" : "hidden"}><TableBoard {...data} selectedId={selectedId} disabled={disabled} onSelect={onSelect} /></div>
    <div className={current === "menu" ? "pos-menu-scroll" : "hidden"}>{menu}</div>
    <div className={current === "orders" ? "pos-menu-scroll" : "hidden"}>
      <h2 className="mb-4 text-lg font-semibold">Đơn đang mở</h2>
      {!data.openOrders.length && <p className="text-sm text-slate-500">Chưa có đơn đang mở.</p>}
      {data.openOrders.map((order) => <button key={order.id} disabled={disabled} className="mb-2 flex min-h-16 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left" onClick={() => router.push(`/pos/ban/${order.id}`)}><span><strong className="block text-sm">Bàn {order.table_label}</strong><span className="text-xs text-slate-500">{order.code}</span></span><strong className="text-sm">{vnd(order.total)}</strong></button>)}
    </div>
  </section>;
}
