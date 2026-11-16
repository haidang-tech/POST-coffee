"use client";

import Image from "next/image";
import Link from "next/link";
import { PosBrowser } from "../../pos-browser";
import type { BoardData } from "../../table-board";
import { useSearchParams, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  CircleAlert,
  Combine,
  Loader2,
  Minus,
  NotebookPen,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn, formatTimeVN, vnd } from "@/lib/utils";
import { previewOrder, searchText } from "@/lib/order-preview";
import type { Category, MenuItem, Order, OrderItem } from "@/lib/types";
import {
  addItemAction,
  cancelOrderAction,
  mergeOrdersAction,
  moveOrderAction,
  payOrderAction,
  setItemNoteAction,
  updateItemQtyAction,
} from "../../actions";

type TableOption = {
  id: string;
  name: string;
  status: string;
  areaName: string;
};

type OpenOrderOption = {
  id: string;
  code: string;
  table_label: string;
  total: number;
};

const QUICK_DISCOUNTS = [0, 5_000, 10_000, 20_000, 50_000];

export function OrderScreen({
  order,
  boardData,
  items: serverItems,
  categories,
  menuItems,
  tables,
  openOrders,
}: {
  order: Order;
  boardData: BoardData;
  items: OrderItem[];
  categories: Category[];
  menuItems: MenuItem[];
  tables: TableOption[];
  openOrders: OpenOrderOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [view, setView] = useState(params.get("view") === "menu" ? "menu" : "tables");
  const [billQuery, setBillQuery] = useState("");
  const [items, preview] = useOptimistic(serverItems, previewOrder);
  const [pending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const searchableMenu = useMemo(() => menuItems.map((item) => ({
    item, text: searchText(`${item.name} ${item.description}`),
  })), [menuItems]);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [showBill, setShowBill] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState("0");
  const [moveOpen, setMoveOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [noteItem, setNoteItem] = useState<OrderItem | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.qty, 0);
  const discount = Math.min(
    Math.max(Math.floor(Number(discountInput) || 0), 0),
    subtotal,
  );
  const total = subtotal - discount;
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  const filteredMenu = useMemo(() => {
    const keyword = searchText(deferredQuery.trim());
    return searchableMenu.filter(({ item, text }) => {
      const matchCategory = categoryId === "all" || item.category_id === categoryId;
      const matchKeyword =
        !keyword ||
        text.includes(keyword);
      return matchCategory && matchKeyword;
    }).map(({ item }) => item);
  }, [searchableMenu, categoryId, deferredQuery]);

  const groupedMenu = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of filteredMenu) {
      const key = item.category_id ?? "other";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [filteredMenu]);

  function showError(message: string) {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 4500);
  }

  function addItem(item: MenuItem) {
    if (pending) return;
    setAddingId(item.id);
    startTransition(async () => {
      preview({ type: "add", item: {
        id: `preview-${item.id}`, order_id: order.id, menu_item_id: item.id,
        name_snapshot: item.name, unit_price: item.price, qty: 1, note: "",
        created_at: new Date().toISOString(),
      } });
      const result = await addItemAction(order.id, item.id, 1);
      setAddingId(null);
      if (!result.ok) showError(result.error);
    });
  }

  function changeQty(item: OrderItem, qty: number) {
    if (pending || qty < 0 || qty > 99) return;
    startTransition(async () => {
      preview({ type: "quantity", id: item.id, qty });
      const result = await updateItemQtyAction(order.id, item.id, qty);
      if (!result.ok) showError(result.error);
    });
  }

  function saveNote() {
    if (!noteItem) return;
    const item = noteItem;
    startTransition(async () => {
      const result = await setItemNoteAction(order.id, item.id, noteDraft);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      setNoteItem(null);
    });
  }

  function pay() {
    startTransition(async () => {
      const result = await payOrderAction(order.id, discount);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      setPayOpen(false);
      router.replace(`/pos/hoa-don/${result.orderId}`);
    });
  }

  function move(tableId: string) {
    startTransition(async () => {
      const result = await moveOrderAction(order.id, tableId);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      setMoveOpen(false);
    });
  }

  function merge(targetId: string) {
    startTransition(async () => {
      const result = await mergeOrdersAction(order.id, targetId);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      setMergeOpen(false);
      router.replace(`/pos/ban/${result.orderId}`);
    });
  }

  function cancelOrder() {
    startTransition(async () => {
      const result = await cancelOrderAction(order.id);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      setCancelOpen(false);
      router.replace("/pos");
    });
  }

  return (
    <main className="pos-workspace">
      {/* Header */}
      <div className="pos-order-heading flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            onClick={(event) => { if (pending) event.preventDefault(); }}
            aria-disabled={pending}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-cream-200 bg-white text-coffee-700 transition-colors hover:bg-cream-100"
            aria-label="Về sơ đồ bàn"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-mocha-400">
              {order.code} · mở lúc {formatTimeVN(order.created_at)}
            </p>
            <h1 className="flex items-center gap-2 text-xl font-semibold leading-tight text-coffee-900 sm:text-2xl">
              Bàn {order.table_label}
              <Badge tone="accent">{itemCount} món</Badge>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMoveOpen(true)}
            disabled={pending}
            aria-label="Chuyển bàn"
            title="Chuyển bàn"
            className="h-10 w-10 gap-2 rounded-xl sm:h-8 sm:w-auto sm:px-3"
          >
            <ArrowRightLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Chuyển bàn</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMergeOpen(true)}
            disabled={pending || openOrders.length === 0}
            aria-label="Gộp đơn"
            title="Gộp đơn"
            className="h-10 w-10 gap-2 rounded-xl sm:h-8 sm:w-auto sm:px-3"
          >
            <Combine className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Gộp đơn</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 gap-2 rounded-xl text-danger-500 hover:bg-danger-500/10 sm:h-8 sm:w-auto sm:px-3"
            onClick={() => setCancelOpen(true)}
            disabled={pending}
            aria-label="Huỷ đơn"
            title="Huỷ đơn"
          >
            <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Huỷ</span>
          </Button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-danger-500/25 bg-danger-500/8 px-4 py-3 text-sm font-medium text-danger-500"
        >
          <CircleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="pos-columns">
        {/* Menu */}
        <PosBrowser data={boardData} selectedId={order.table_id} disabled={pending} view={view} onView={setView} onSelect={(table, openMenu) => {
          if (table.id === order.table_id) { if (openMenu) setView("menu"); return; }
          const target = boardData.openOrders.find((entry) => entry.table_id === table.id);
          startTransition(() => router.push(target ? `/pos/ban/${target.id}${openMenu ? "?view=menu" : ""}` : `/pos?table=${table.id}${openMenu ? "&view=menu" : ""}`));
        }} menu={<section className="space-y-3">
          <div className="sticky top-0 z-10 rounded-xl border border-cream-200 bg-white p-3 shadow-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm món, ví dụ: ca phe, nuoc ep…"
                className="border-transparent bg-cream-50 pl-10 focus:border-coffee-500 focus:bg-white"
                aria-label="Tìm món"
              />
            </div>
            <div className="no-scrollbar -mb-1 mt-3 flex gap-1.5 overflow-x-auto pb-1">
              <CategoryChip
                active={categoryId === "all"}
                onClick={() => setCategoryId("all")}
                label="Tất cả"
              />
              {categories.map((category) => (
                <CategoryChip
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                  label={category.name}
                />
              ))}
            </div>
          </div>

          {filteredMenu.length === 0 ? (
            <div className="rounded-2xl border border-cream-200 bg-white">
              <EmptyState
                title="Không tìm thấy món"
                description="Thử từ khoá khác hoặc chọn nhóm khác."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categories
                .filter(
                  (category) => (groupedMenu.get(category.id) ?? []).length > 0,
                )
                .map((category) => (
                  <div key={category.id} className="space-y-2">
                    <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mocha-400">
                      {category.name}
                    </h2>
                    <div className="space-y-2">
                      {(groupedMenu.get(category.id) ?? []).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addItem(item)}
                          disabled={pending}
                          className="group flex min-h-24 w-full items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 text-left transition-colors hover:border-accent-500 hover:bg-cream-50 disabled:opacity-70"
                        >
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt=""
                              width={72}
                              height={72}
                              sizes="72px"
                              className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-cream-100 text-mocha-400">
                              <ReceiptText className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-coffee-900">
                              {item.name}
                            </span>
                            {item.description ? (
                              <span className="mt-0.5 block truncate text-[11px] text-mocha-400">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-semibold tabular-nums text-coffee-800">
                              {vnd(item.price)}
                            </span>
                            <span className="mt-1 flex items-center justify-end gap-1 text-[11px] font-medium text-accent-600">
                              {addingId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                              Thêm
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

              {groupedMenu.has("other") ? (
                <div className="space-y-2">
                  <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mocha-400">
                    Khác
                  </h2>
                  <div className="space-y-2">
                    {(groupedMenu.get("other") ?? []).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addItem(item)}
                        disabled={pending}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-cream-200 bg-white p-3 text-left text-sm transition-all hover:border-mocha-300 disabled:opacity-60"
                      >
                        <span className="font-semibold">{item.name}</span>
                        <span className="tabular-nums">{vnd(item.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>} />

        {/* Bill */}
        <aside
          className={cn(
            "pos-bill",
            showBill
              ? "mobile-open" : "mobile-closed",
          )}
        >
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-cream-200 bg-cream-50 p-2" aria-label="Đơn đang mở">
            <span className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Bàn {order.table_label}</span>
            {boardData.openOrders.filter((entry) => entry.id !== order.id).map((entry) => <button key={entry.id} disabled={pending} className="min-h-10 shrink-0 rounded-md px-3 text-xs text-coffee-700 hover:bg-white" onClick={() => startTransition(() => router.push(`/pos/ban/${entry.id}`))}>Bàn {entry.table_label}</button>)}
            <button disabled={pending} onClick={() => router.push("/pos")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-white" aria-label="Chọn bàn cho đơn mới"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-cream-200 px-4 py-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-coffee-900">Đơn hiện tại {pending && <span role="status" className="text-xs font-normal text-accent-600">Đang lưu…</span>}</h2>
              <p className="text-[11px] text-mocha-400">
                Bàn {order.table_label} · {order.code}
              </p>
            </div>
            <button type="button" disabled={pending} onClick={() => router.push("/pos")} className="hidden h-11 w-11 items-center justify-center rounded-lg text-mocha-400 hover:bg-cream-100 md:flex" aria-label="Đóng bảng đơn, giữ đơn đang mở"><X className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={() => setShowBill(false)}
              className="rounded-lg p-1.5 text-mocha-400 hover:bg-cream-100 md:hidden"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-b border-cream-200 p-3">
            <Input aria-label="T?m m?n trong ??n" placeholder="T?m m?n trong ??n?" value={billQuery} onChange={(event) => setBillQuery(event.target.value)} className="min-w-0 flex-1" />
            <Button variant="outline" onClick={() => { setView("menu"); setShowBill(false); }}><Plus className="h-4 w-4" />Th?m m?n</Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {billQuery && !items.some((item) => searchText(item.name_snapshot).includes(searchText(billQuery))) && <p className="py-6 text-center text-sm text-mocha-400">Không tìm thấy món trong đơn.</p>}
            {items.length === 0 ? (
              <EmptyState
                title="Chưa có món nào"
                description="Chọn món ở thực đơn bên trái để thêm vào đơn."
              />
            ) : (
              <ul className="divide-y divide-cream-200">
                {items.filter((item) => searchText(item.name_snapshot).includes(searchText(billQuery))).map((item, index) => (
                  <li key={item.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight text-coffee-900">
                          <span className="mr-2 text-xs font-normal text-mocha-400">{index + 1}.</span>{item.name_snapshot}
                        </p>
                        <p className="mt-0.5 text-[11px] text-mocha-400">
                          {vnd(item.unit_price)} / món
                        </p>
                        {item.note ? (
                          <p className="mt-1 inline-flex rounded-md bg-cream-100 px-1.5 py-0.5 text-[11px] text-coffee-700">
                            {item.note}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-coffee-800">
                        {vnd(item.unit_price * item.qty)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeQty(item, item.qty - 1)}
                          disabled={pending}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-cream-200 text-coffee-700 transition-colors hover:bg-cream-100 disabled:opacity-50"
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(item, item.qty + 1)}
                          disabled={pending}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-cream-200 text-coffee-700 transition-colors hover:bg-cream-100 disabled:opacity-50"
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setNoteDraft(item.note);
                          setNoteItem(item);
                        }}
                        className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-mocha-400 transition-colors hover:bg-cream-100 hover:text-coffee-700"
                      >
                        <NotebookPen className="h-3 w-3" />
                        Ghi chú
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {order.note && <p className="shrink-0 border-t border-cream-200 px-4 py-2 text-xs text-mocha-400">Ghi ch?: {order.note}</p>}
          <div className="pos-checkout shrink-0 border-t border-cream-200 px-4 py-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-mocha-400">
                <span>Tạm tính</span>
                <span className="tabular-nums">{vnd(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-accent-600">
                  <span>Giảm giá</span>
                  <span className="tabular-nums">−{vnd(discount)}</span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-semibold">Tổng cộng</span>
                <span className="text-xl font-semibold tabular-nums text-coffee-900">
                  {vnd(total)}
                </span>
              </div>
            </div>

            <Button
              size="lg"
              className="pos-pay mt-3 w-full"
              onClick={() => {
                setDiscountInput("0");
                setPayOpen(true);
              }}
              disabled={pending || items.length === 0}
            >
              <Wallet className="h-4 w-4" /> Thanh toán
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile bill bar */}
      {!showBill ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setShowBill(true)}
            className="flex w-full items-center justify-between gap-3"
          >
            <span className="text-left">
              <span className="block text-[11px] text-mocha-400">
                {itemCount} món · Bàn {order.table_label}
              </span>
              <span className="text-lg font-semibold tabular-nums text-coffee-900">
                {vnd(subtotal)}
              </span>
            </span>
            <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-coffee-700 px-5 text-sm font-semibold text-cream-50">
              <ReceiptText className="h-4 w-4" /> Xem đơn
            </span>
          </button>
        </div>
      ) : null}

      {/* Pay modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Thanh toán"
        description={`${order.code} · Bàn ${order.table_label}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-cream-50 p-3.5">
            <div className="flex justify-between text-sm text-mocha-400">
              <span>Tạm tính</span>
              <span className="tabular-nums">{vnd(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm text-mocha-400">
              <span>Giảm giá</span>
              <span className="tabular-nums">−{vnd(discount)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-cream-200 pt-2">
              <span className="text-sm font-semibold">Khách trả</span>
              <span className="text-2xl font-semibold tabular-nums text-coffee-900">
                {vnd(total)}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-coffee-700">Giảm giá</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DISCOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDiscountInput(String(value))}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    Number(discountInput) === value
                      ? "border-coffee-700 bg-coffee-700 text-cream-50"
                      : "border-cream-200 bg-white text-coffee-700 hover:bg-cream-100",
                  )}
                >
                  {value === 0 ? "Không" : vnd(value)}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={0}
              max={subtotal}
              step={1000}
              inputMode="numeric"
              value={discountInput}
              onChange={(event) => setDiscountInput(event.target.value)}
              className="mt-2"
              aria-label="Số tiền giảm giá"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPayOpen(false)}
              disabled={pending}
            >
              Quay lại
            </Button>
            <Button className="flex-[1.4]" onClick={pay} disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Xác nhận đã thu tiền
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move table modal */}
      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Chuyển bàn"
        description="Chọn bàn trống để chuyển đơn sang."
      >
        <div className="max-h-[55vh] space-y-4 overflow-y-auto">
          {tables
            .filter((table) => table.id !== order.table_id)
            .map((table) => (
              <div key={table.id} className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mocha-400">
                  {table.areaName}
                </p>
                <div className="flex items-center justify-between rounded-xl border border-cream-200 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-coffee-900">{table.name}</p>
                    <p className="text-[11px] text-mocha-400">
                      {table.status === "busy" ? "Đang có khách" : "Trống"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={table.status === "busy" ? "secondary" : "primary"}
                    disabled={pending || table.status === "busy"}
                    onClick={() => move(table.id)}
                  >
                    Chuyển
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </Modal>

      {/* Merge modal */}
      <Modal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        title="Gộp đơn"
        description="Chuyển toàn bộ món của đơn này sang một đơn đang mở khác."
      >
        <div className="space-y-2">
          {openOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-mocha-400">
              Không có đơn nào khác đang mở.
            </p>
          ) : (
            openOrders.map((target) => (
              <div
                key={target.id}
                className="flex items-center justify-between rounded-xl border border-cream-200 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-coffee-900">
                    Bàn {target.table_label}
                  </p>
                  <p className="text-[11px] text-mocha-400">
                    {target.code} · {vnd(target.total)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => merge(target.id)}
                >
                  Gộp vào đây
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Huỷ đơn?"
        description="Đơn sẽ được đánh dấu đã huỷ và bàn trở về trạng thái trống."
        size="sm"
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setCancelOpen(false)}
            disabled={pending}
          >
            Giữ đơn
          </Button>
          <Button variant="danger" className="flex-1" onClick={cancelOrder} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Huỷ đơn
          </Button>
        </div>
      </Modal>

      {/* Item note modal */}
      <Modal
        open={Boolean(noteItem)}
        onClose={() => setNoteItem(null)}
        title="Ghi chú món"
        description={noteItem?.name_snapshot}
        size="sm"
      >
        <div className="space-y-3">
          <Textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            maxLength={200}
            placeholder="Ví dụ: ít đá, ít đường, không sữa…"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setNoteItem(null)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button className="flex-1" onClick={saveNote} disabled={pending}>
              Lưu ghi chú
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-coffee-700 text-cream-50"
          : "bg-cream-100 text-coffee-700 hover:bg-cream-200",
      )}
    >
      {label}
    </button>
  );
}
