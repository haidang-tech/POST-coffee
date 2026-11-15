import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Printer, XCircle } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, MenuItem, Order, OrderItem } from "@/lib/types";
import { formatDateTimeVN, vnd } from "@/lib/utils";
import { OrderScreen } from "./order-screen";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();

  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!orderRow) notFound();
  const order = orderRow as Order;

  const [itemsRes, categoriesRes, menuRes, tablesRes, openRes] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at"),
    supabase.from("categories").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("tables")
      .select("id, name, status, is_active, areas(name)")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("orders")
      .select("id, code, table_label, total, table_id")
      .eq("status", "open")
      .neq("id", id)
      .order("created_at"),
  ]);

  const items = (itemsRes.data ?? []) as OrderItem[];
  const categories = (categoriesRes.data ?? []) as Category[];
  const menuItems = (menuRes.data ?? []) as MenuItem[];
  const tables = (tablesRes.data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    status: row.status as string,
    areaName:
      ((row.areas as { name?: string } | null)?.name ?? "Khu vực") as string,
  }));
  const openOrders = (openRes.data ?? []).map((row) => ({
    id: row.id as string,
    code: row.code as string,
    table_label: row.table_label as string,
    total: row.total as number,
  }));

  if (order.status !== "open") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/pos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-mocha-400 transition-colors hover:text-coffee-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Về sơ đồ bàn
        </Link>

        <div className="mt-4 rounded-2xl border border-cream-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-mocha-400">
                {order.code} · Bàn {order.table_label}
              </p>
              <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold">
                {order.status === "paid" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success-500" /> Đã thanh
                    toán
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-danger-500" /> Đơn đã huỷ
                  </>
                )}
              </h1>
              <p className="mt-1 text-xs text-mocha-400">
                {formatDateTimeVN(order.paid_at ?? order.updated_at)}
              </p>
            </div>
            {order.status === "paid" ? (
              <Link
                href={`/pos/hoa-don/${order.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-cream-200 bg-cream-50 px-4 text-sm font-medium text-coffee-700 transition-colors hover:bg-cream-100"
              >
                <Printer className="h-4 w-4" /> In hoá đơn
              </Link>
            ) : null}
          </div>

          <ul className="divide-y divide-cream-200 px-5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  <span className="font-medium text-coffee-900">
                    {item.qty}× {item.name_snapshot}
                  </span>
                  {item.note ? (
                    <span className="ml-2 text-[11px] text-mocha-400">
                      ({item.note})
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums text-coffee-700">
                  {vnd(item.qty * item.unit_price)}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-1.5 border-t border-cream-200 px-5 py-4 text-sm">
            <div className="flex justify-between text-mocha-400">
              <span>Tạm tính</span>
              <span className="tabular-nums">{vnd(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-mocha-400">
              <span>Giảm giá</span>
              <span className="tabular-nums">−{vnd(order.discount)}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-semibold text-coffee-900">
              <span>Tổng cộng</span>
              <span className="tabular-nums">{vnd(order.total)}</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <OrderScreen
      order={order}
      items={items}
      categories={categories}
      menuItems={menuItems}
      tables={tables}
      openOrders={openOrders}
    />
  );
}
