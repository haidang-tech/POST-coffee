import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Coffee } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderItem } from "@/lib/types";
import { formatDateTimeVN, vnd } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReceiptPage({
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
  if (order.status !== "paid") redirect(`/pos/ban/${order.id}`);

  const [itemsRes, staffRes] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at"),
    order.paid_by
      ? supabase.from("profiles").select("full_name").eq("id", order.paid_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const items = (itemsRes.data ?? []) as OrderItem[];
  const staffName =
    (staffRes.data as { full_name: string } | null)?.full_name || "Nhân viên";

  return (
    <main className="mx-auto max-w-md px-4 py-8 print:max-w-none print:p-0">
      <div className="print-hidden mb-5 flex items-center justify-between gap-2">
        <Link
          href="/pos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-mocha-400 transition-colors hover:text-coffee-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Về sơ đồ bàn
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-6 print:rounded-none print:border-0 print:p-0">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-coffee-800 text-cream-50 print:hidden">
            <Coffee className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-semibold tracking-wide text-coffee-900">
            POST Coffee
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-mocha-400">
            Cảm ơn bạn đã ghé chơi
            <br />
            postcoffee.vn
          </p>
        </div>

        <div className="my-5 border-t border-dashed border-cream-300" />

        <div className="space-y-1 text-[11px] text-coffee-700">
          <div className="flex justify-between">
            <span className="text-mocha-400">Mã đơn</span>
            <span className="font-semibold">{order.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mocha-400">Bàn</span>
            <span className="font-semibold">{order.table_label || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mocha-400">Thời gian</span>
            <span>{formatDateTimeVN(order.paid_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mocha-400">Thu ngân</span>
            <span>{staffName}</span>
          </div>
        </div>

        <div className="my-5 border-t border-dashed border-cream-300" />

        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-mocha-400">
              <th className="pb-2 font-medium">Món</th>
              <th className="pb-2 text-center font-medium">SL</th>
              <th className="pb-2 text-right font-medium">T.Tiền</th>
            </tr>
          </thead>
          <tbody className="text-coffee-800">
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-1 pr-2">
                  {item.name_snapshot}
                  {item.note ? (
                    <span className="block text-[10px] italic text-mocha-400">
                      {item.note}
                    </span>
                  ) : null}
                </td>
                <td className="py-1 text-center tabular-nums">{item.qty}</td>
                <td className="py-1 text-right tabular-nums">
                  {vnd(item.unit_price * item.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-4 border-t border-dashed border-cream-300" />

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-coffee-700">
            <span className="text-mocha-400">Tạm tính</span>
            <span className="tabular-nums">{vnd(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-coffee-700">
            <span className="text-mocha-400">Giảm giá</span>
            <span className="tabular-nums">−{vnd(order.discount)}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-cream-200 pt-2">
            <span className="text-sm font-semibold text-coffee-900">Tổng cộng</span>
            <span className="text-lg font-semibold tabular-nums text-coffee-900">
              {vnd(order.total)}
            </span>
          </div>
          <div className="flex justify-between pt-1 text-mocha-400">
            <span>Hình thức</span>
            <span>Tiền mặt / Chuyển khoản</span>
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] leading-relaxed text-mocha-400">
          <p className="font-medium text-coffee-700">Hẹn gặp lại bạn ☕</p>
          <p className="mt-1">Hoá đơn chỉ có giá trị trong ngày.</p>
        </div>
      </div>
    </main>
  );
}
