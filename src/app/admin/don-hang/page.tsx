import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { cn, formatDateTimeVN, vnd, vnDayKey, vnDayRange } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "success" | "accent" | "danger" }> = {
  paid: { label: "Đã thanh toán", tone: "success" },
  open: { label: "Đang mở", tone: "accent" },
  cancelled: { label: "Đã huỷ", tone: "danger" },
};

const RANGES = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày" },
  { key: "all", label: "Tất cả" },
] as const;

const STATUS_FILTERS = [
  { key: "all", label: "Mọi trạng thái" },
  { key: "paid", label: "Đã thanh toán" },
  { key: "open", label: "Đang mở" },
  { key: "cancelled", label: "Đã huỷ" },
] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const range = (["today", "7d", "all"].includes(params.range ?? "")
    ? params.range
    : "today") as "today" | "7d" | "all";
  const status = (["all", "paid", "open", "cancelled"].includes(params.status ?? "")
    ? params.status
    : "all") as "all" | "paid" | "open" | "cancelled";

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (range !== "all") {
    const days = range === "today" ? 1 : 7;
    const start = new Date(
      vnDayRange(vnDayKey(new Date(Date.now() - (days - 1) * 86_400_000))).start,
    );
    query = query.gte("created_at", start.toISOString());
  }
  if (status !== "all") query = query.eq("status", status);

  const { data } = await query;
  const orders = (data ?? []) as Order[];

  const totals = orders.reduce(
    (acc, order) => {
      if (order.status === "paid") {
        acc.revenue += order.total;
        acc.paid += 1;
        acc.discount += order.discount;
      }
      if (order.status === "open") acc.open += 1;
      if (order.status === "cancelled") acc.cancelled += 1;
      return acc;
    },
    { revenue: 0, paid: 0, open: 0, cancelled: 0, discount: 0 },
  );

  function href(next: { range?: string; status?: string }) {
    const search = new URLSearchParams();
    search.set("range", next.range ?? range);
    search.set("status", next.status ?? status);
    return `/admin/don-hang?${search.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Đơn hàng"
        description="Tra cứu đơn, doanh thu và in lại hoá đơn."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Doanh thu" value={vnd(totals.revenue)} accent />
        <MiniStat label="Đơn đã thu" value={`${totals.paid} đơn`} />
        <MiniStat
          label="Đơn mở / huỷ"
          value={`${totals.open} / ${totals.cancelled}`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-cream-200 bg-white p-1">
          {RANGES.map((item) => (
            <Link
              key={item.key}
              href={href({ range: item.key })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                range === item.key
                  ? "bg-coffee-700 text-cream-50"
                  : "text-mocha-400 hover:bg-cream-100 hover:text-coffee-700",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex rounded-xl border border-cream-200 bg-white p-1">
          {STATUS_FILTERS.map((item) => (
            <Link
              key={item.key}
              href={href({ status: item.key })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                status === item.key
                  ? "bg-coffee-700 text-cream-50"
                  : "text-mocha-400 hover:bg-cream-100 hover:text-coffee-700",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader
          title={`${orders.length} đơn`}
          description={`Giảm giá đã áp dụng: ${vnd(totals.discount)}`}
        />
        {orders.length === 0 ? (
          <EmptyState title="Không có đơn nào" description="Thử đổi bộ lọc thời gian." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-[11px] uppercase tracking-[0.14em] text-mocha-400">
                  <th className="px-5 py-2.5 font-medium">Mã</th>
                  <th className="px-5 py-2.5 font-medium">Bàn</th>
                  <th className="px-5 py-2.5 font-medium">Thời gian</th>
                  <th className="px-5 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-5 py-2.5 text-right font-medium">Giảm</th>
                  <th className="px-5 py-2.5 text-right font-medium">Tổng</th>
                  <th className="px-5 py-2.5 text-right font-medium">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {orders.map((order) => {
                  const meta = STATUS[order.status] ?? STATUS.open;
                  const link =
                    order.status === "paid"
                      ? `/pos/hoa-don/${order.id}`
                      : `/pos/ban/${order.id}`;
                  return (
                    <tr key={order.id} className="hover:bg-cream-50">
                      <td className="px-5 py-3 font-semibold text-coffee-900">
                        {order.code}
                      </td>
                      <td className="px-5 py-3 text-coffee-700">{order.table_label}</td>
                      <td className="px-5 py-3 text-[12px] text-mocha-400">
                        {formatDateTimeVN(order.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-[12px] tabular-nums text-mocha-400">
                        {order.discount > 0 ? `−${vnd(order.discount)}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        {vnd(order.total)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {order.status === "paid" ? (
                          <Link
                            href={link}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-600 hover:text-accent-500"
                          >
                            <Download className="h-3 w-3" /> Hoá đơn
                          </Link>
                        ) : (
                          <Link
                            href={link}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-mocha-400 hover:text-coffee-700"
                          >
                            <ExternalLink className="h-3 w-3" /> Mở
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        accent
          ? "border-coffee-800 bg-coffee-800 text-cream-50"
          : "border-cream-200 bg-white",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em]",
          accent ? "text-accent-500" : "text-mocha-400",
        )}
      >
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
