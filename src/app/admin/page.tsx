import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { cn, dayLabelVN, formatTimeVN, lastNDayKeys, vnd, vnDayKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "accent" | "danger" }> = {
  paid: { label: "Đã thanh toán", tone: "success" },
  open: { label: "Đang mở", tone: "accent" },
  cancelled: { label: "Đã huỷ", tone: "danger" },
};

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();

  const today = vnDayKey();
  const days = lastNDayKeys(7);

  const [revenueRes, topRes, recentRes, openRes] = await Promise.all([
    supabase
      .from("v_daily_revenue")
      .select("day, revenue, order_count")
      .gte("day", days[0]),
    supabase.rpc("admin_top_items", { p_days: 30, p_limit: 5 }),
    supabase
      .from("orders")
      .select("id, code, table_label, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
  ]);

  const revenueByDay = new Map(
    (revenueRes.data ?? []).map((row) => [
      row.day as string,
      { revenue: Number(row.revenue), orders: Number(row.order_count) },
    ]),
  );

  const todayStats = revenueByDay.get(today) ?? { revenue: 0, orders: 0 };
  const average = todayStats.orders > 0 ? todayStats.revenue / todayStats.orders : 0;

  const series = days.map((day) => ({
    day,
    label: dayLabelVN(day),
    revenue: revenueByDay.get(day)?.revenue ?? 0,
    orders: revenueByDay.get(day)?.orders ?? 0,
  }));
  const maxRevenue = Math.max(...series.map((point) => point.revenue), 1);
  const weekRevenue = series.reduce((sum, point) => sum + point.revenue, 0);

  const topItems = ((topRes.data ?? []) as {
    name: string;
    qty_sold: number;
    revenue: number;
  }[]).map((row) => ({
    name: row.name,
    qty: Number(row.qty_sold),
    revenue: Number(row.revenue),
  }));
  const topMax = Math.max(...topItems.map((item) => item.qty), 1);

  const recent = recentRes.data ?? [];

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        description="Tình hình kinh doanh của POST Coffee hôm nay."
        action={
          <Link
            href="/pos"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-coffee-700 px-4 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800"
          >
            Mở quầy <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          label="Doanh thu hôm nay"
          value={vnd(todayStats.revenue)}
          hint={`${todayStats.orders} đơn đã thanh toán`}
          tone="coffee"
        />
        <KpiCard
          icon={<ReceiptText className="h-4 w-4" />}
          label="Đơn hôm nay"
          value={todayStats.orders.toLocaleString("vi-VN")}
          hint={`TB ${vnd(average)} / đơn`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Doanh thu 7 ngày"
          value={vnd(weekRevenue)}
          hint={`${series.reduce((sum, point) => sum + point.orders, 0)} đơn`}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Đơn đang mở"
          value={(openRes.count ?? 0).toLocaleString("vi-VN")}
          hint="Bàn đang phục vụ"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Doanh thu 7 ngày gần nhất"
            description={`Tổng ${vnd(weekRevenue)}`}
          />
          <div className="px-5 pb-5 pt-6">
            <div className="flex h-52 items-end gap-2 sm:gap-3">
              {series.map((point) => {
                const height = Math.round((point.revenue / maxRevenue) * 100);
                const isToday = point.day === today;
                return (
                  <div
                    key={point.day}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                    title={`${point.label}: ${vnd(point.revenue)} · ${point.orders} đơn`}
                  >
                    <span className="text-[10px] font-medium tabular-nums text-mocha-400 opacity-0 transition-opacity group-hover:opacity-100">
                      {point.revenue > 0 ? `${Math.round(point.revenue / 1000)}k` : "0"}
                    </span>
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-colors",
                        point.revenue > 0
                          ? isToday
                            ? "bg-accent-500"
                            : "bg-coffee-600/80 group-hover:bg-coffee-700"
                          : "bg-cream-200",
                      )}
                      style={{ height: `${Math.max(height, 3)}%` }}
                    />
                    <span
                      className={cn(
                        "text-[10px]",
                        isToday ? "font-semibold text-coffee-900" : "text-mocha-400",
                      )}
                    >
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Món bán chạy" description="Xếp theo số lượng đã bán" />
          {topItems.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Doanh số sẽ hiện sau đơn đầu tiên." />
          ) : (
            <ul className="space-y-3 px-5 py-4">
              {topItems.map((item, index) => (
                <li key={item.name}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-coffee-900">
                      <span className="mr-1.5 text-[11px] font-semibold text-mocha-400">
                        #{index + 1}
                      </span>
                      {item.name}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-mocha-400">
                      {item.qty} · {vnd(item.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-100">
                    <div
                      className="h-full rounded-full bg-accent-500/80"
                      style={{ width: `${Math.max((item.qty / topMax) * 100, 4)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Đơn gần đây"
          action={
            <Link
              href="/admin/don-hang"
              className="text-xs font-semibold text-accent-600 hover:text-accent-500"
            >
              Xem tất cả
            </Link>
          }
        />
        {recent.length === 0 ? (
          <EmptyState title="Chưa có đơn nào" description="Đơn hàng mới sẽ xuất hiện ở đây." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-[11px] uppercase tracking-[0.14em] text-mocha-400">
                  <th className="px-5 py-2.5 font-medium">Mã đơn</th>
                  <th className="px-5 py-2.5 font-medium">Bàn</th>
                  <th className="px-5 py-2.5 font-medium">Thời gian</th>
                  <th className="px-5 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-5 py-2.5 text-right font-medium">Tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {recent.map((order) => {
                  const status = STATUS_LABEL[order.status] ?? STATUS_LABEL.open;
                  return (
                    <tr key={order.id} className="hover:bg-cream-50">
                      <td className="px-5 py-3 font-semibold text-coffee-900">
                        {order.code}
                      </td>
                      <td className="px-5 py-3 text-coffee-700">{order.table_label}</td>
                      <td className="px-5 py-3 text-[12px] text-mocha-400">
                        {formatTimeVN(order.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        {vnd(order.total)}
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

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "plain",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "plain" | "coffee";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "coffee"
          ? "border-coffee-800 bg-coffee-800 text-cream-50"
          : "border-cream-200 bg-white",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
          tone === "coffee" ? "text-accent-500" : "text-mocha-400",
        )}
      >
        {icon}
        {label}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "coffee" ? "text-cream-50" : "text-coffee-900",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1 text-[11px]",
          tone === "coffee" ? "text-cream-200/70" : "text-mocha-400",
        )}
      >
        {hint}
      </p>
    </div>
  );
}
