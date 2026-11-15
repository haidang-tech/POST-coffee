"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Armchair,
  CalendarClock,
  CircleAlert,
  Loader2,
  ReceiptText,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { openTableAction, setTableStatusAction } from "./actions";
import { Badge, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatTimeVN, vnd } from "@/lib/utils";
import type { Area, CoffeeTable } from "@/lib/types";

type OpenOrder = {
  id: string;
  code: string;
  table_id: string | null;
  total: number;
  created_at: string;
  itemCount: number;
};

const STATUS_LABEL: Record<CoffeeTable["status"], string> = {
  empty: "Trống",
  busy: "Có khách",
  reserved: "Đặt trước",
};

export function TableBoard({
  areas,
  tables,
  openOrders,
}: {
  areas: Area[];
  tables: CoffeeTable[];
  openOrders: OpenOrder[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyTable, setBusyTable] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CoffeeTable["status"] | "all">("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  // Realtime: khi bàn/đơn thay đổi (kể cả từ thiết bị khác) thì refresh dữ liệu server.
  useEffect(() => {
    const supabase = createClient();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let dirty = false;

    const schedule = () => {
      dirty = true;
      if (timeout) clearTimeout(timeout);
      if (document.hidden) return;
      timeout = setTimeout(() => {
        dirty = false;
        startTransition(() => router.refresh());
      }, 500);
    };
    const onVisible = () => {
      if (!document.hidden && dirty) schedule();
    };
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabase
      .channel("pos-table-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, schedule)
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const orderByTable = useMemo(() => {
    const map = new Map<string, OpenOrder>();
    for (const order of openOrders) {
      if (order.table_id) map.set(order.table_id, order);
    }
    return map;
  }, [openOrders]);

  const grouped = useMemo(() => {
    const list = areas.length
      ? areas
      : [{ id: "none", name: "Khu vực", sort_order: 0 } as Area];
    return list.filter((area) => areaFilter === "all" || area.id === areaFilter).map((area) => ({
      area,
      tables: tables.filter((table) =>
        (!areas.length || table.area_id === area.id) &&
        (statusFilter === "all" || (orderByTable.has(table.id) ? "busy" : table.status) === statusFilter),
      ),
    }));
  }, [areas, tables, areaFilter, statusFilter, orderByTable]);

  const stats = useMemo(() => {
    const busy = tables.filter((t) => orderByTable.has(t.id) || t.status === "busy").length;
    const reserved = tables.filter((t) => !orderByTable.has(t.id) && t.status === "reserved").length;
    const openRevenue = openOrders.reduce((sum, order) => sum + order.total, 0);
    return { busy, reserved, empty: tables.length - busy - reserved, openRevenue };
  }, [tables, openOrders, orderByTable]);

  function openOrView(table: CoffeeTable) {
    setError(null);
    const existing = orderByTable.get(table.id);
    if (existing) {
      router.push(`/pos/ban/${existing.id}`);
      return;
    }
    setBusyTable(table.id);
    startTransition(async () => {
      const result = await openTableAction(table.id);
      setBusyTable(null);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      router.push(`/pos/ban/${result.orderId}`);
    });
  }

  function changeStatus(table: CoffeeTable, status: "empty" | "reserved") {
    setError(null);
    setBusyTable(table.id);
    startTransition(async () => {
      const result = await setTableStatusAction(table.id, status);
      setBusyTable(null);
      if (!result.ok) showError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-600">
            Ca làm việc
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-coffee-900">Sơ đồ bàn</h1>
          <p className="mt-1 text-sm text-mocha-400">
            Chọn bàn để mở đơn hoặc xem đơn đang phục vụ.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatPill
            icon={<Users className="h-3.5 w-3.5" />}
            label="Có khách"
            value={stats.busy}
            tone="coffee"
          />
          <StatPill
            icon={<CalendarClock className="h-3.5 w-3.5" />}
            label="Đặt trước"
            value={stats.reserved}
            tone="accent"
          />
          <StatPill
            icon={<Armchair className="h-3.5 w-3.5" />}
            label="Trống"
            value={stats.empty}
            tone="neutral"
          />
          <StatPill
            icon={<ReceiptText className="h-3.5 w-3.5" />}
            label="Đơn mở"
            value={vnd(stats.openRevenue)}
            tone="success"
          />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-danger-500/25 bg-danger-500/8 px-4 py-3 text-sm font-medium text-danger-500"
        >
          <CircleAlert className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {tables.length === 0 ? (
        <div className="rounded-2xl border border-cream-200 bg-white">
          <EmptyState
            title="Chưa có bàn nào"
            description="Vào mục Quản lý → Bàn để thêm khu vực và bàn trước khi bắt đầu bán hàng."
          />
        </div>
      ) : null}

      <div className="flex flex-col items-stretch justify-between gap-2 rounded-2xl border border-cream-200 bg-white p-2.5 sm:flex-row sm:items-center sm:gap-3 sm:p-3">
        <div className="flex flex-wrap gap-1" aria-label="Lọc trạng thái bàn">
          {([['all', 'Tất cả'], ['empty', 'Trống'], ['busy', 'Có khách'], ['reserved', 'Đặt trước']] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={statusFilter === value}
              onClick={() => setStatusFilter(value)}
              className={cn("min-h-10 rounded-xl px-3 py-2 text-xs font-semibold transition-colors", statusFilter === value ? "bg-coffee-800 text-white" : "text-mocha-400 hover:bg-cream-100")}>
              {label}
            </button>
          ))}
        </div>
        <select aria-label="Lọc khu vực" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3 text-sm text-coffee-700 sm:w-auto">
          <option value="all">Tất cả khu vực</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
      </div>
      {tables.length > 0 && grouped.every((group) => group.tables.length === 0) && <EmptyState title="Không có bàn phù hợp" description="Chọn trạng thái hoặc khu vực khác để xem bàn." />}
      <div className="space-y-8">
        {grouped.map(({ area, tables: areaTables }) =>
          areaTables.length === 0 ? null : (
            <section key={area.id}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-coffee-700">
                  {area.name}
                </h2>
                <span className="text-[11px] text-mocha-400">
                  {areaTables.length} bàn
                </span>
                <span className="h-px flex-1 bg-cream-200" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {areaTables.map((table) => {
                  const order = orderByTable.get(table.id);
                  const status: CoffeeTable["status"] = order ? "busy" : table.status;
                  const isLoading = pending && busyTable === table.id;

                  return (
                    <div
                      key={table.id}
                      className={cn(
                        "group relative flex min-h-40 flex-col overflow-hidden rounded-2xl border transition-colors sm:min-h-44",
                        status === "busy" &&
                          "border-coffee-800 bg-coffee-800 text-cream-50 shadow-md",
                        status === "empty" &&
                          "border-cream-200 bg-white hover:border-success-500 hover:shadow-sm",
                        status === "reserved" &&
                          "border-accent-500/35 bg-accent-500/8",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openOrView(table)}
                        disabled={pending}
                        className="flex flex-1 flex-col items-start gap-3 p-3.5 text-left disabled:opacity-70 sm:p-4"
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-xl font-semibold tracking-tight",
                              status === "busy" ? "text-cream-50" : "text-coffee-900",
                            )}
                          >
                            {table.name}
                          </span>
                          {isLoading ? (
                            <Loader2
                              className={cn(
                                "h-4 w-4 animate-spin",
                                status === "busy" ? "text-cream-100" : "text-mocha-400",
                              )}
                            />
                          ) : (
                            <Badge
                              tone={
                                status === "busy"
                                  ? "accent"
                                  : status === "reserved"
                                    ? "warning"
                                    : "neutral"
                              }
                              className={status === "busy" ? "border-cream-200/25" : ""}
                            >
                              {STATUS_LABEL[status]}
                            </Badge>
                          )}
                        </div>

                        <span
                          className={cn(
                            "flex items-center gap-1 text-[11px]",
                            status === "busy" ? "text-cream-200/80" : "text-mocha-400",
                          )}
                        >
                          <Users className="h-3 w-3" />
                          {table.seats} chỗ
                        </span>

                        {order ? (
                          <div className="mt-auto w-full border-t border-cream-200/20 pt-2.5">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[11px] text-cream-200/70">
                                {order.itemCount} món · {formatTimeVN(order.created_at)}
                              </span>
                              <span className="text-sm font-semibold text-cream-50">
                                {vnd(order.total)}
                              </span>
                            </div>
                            <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-accent-500">
                              {order.code} · xem đơn
                            </span>
                          </div>
                        ) : (
                          <span className="mt-auto text-[11px] text-mocha-400">
                            Nhấn để mở bàn
                          </span>
                        )}
                      </button>

                      {status === "empty" ? (
                        <div className="flex gap-1.5 border-t border-cream-200 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => changeStatus(table, "reserved")}
                            disabled={pending}
                            className="min-h-10 rounded-lg px-2.5 py-2 text-[11px] font-medium text-mocha-400 transition-colors hover:bg-cream-100 hover:text-coffee-700"
                          >
                            Đặt trước
                          </button>
                        </div>
                      ) : null}

                      {status === "reserved" && !order ? (
                        <div className="flex gap-1.5 border-t border-accent-500/20 px-3 py-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openOrView(table)}
                            disabled={pending}
                            className="h-7 flex-1"
                          >
                            Nhận bàn
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => changeStatus(table, "empty")}
                            disabled={pending}
                            className="h-7"
                          >
                            Bỏ đặt
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "coffee" | "accent" | "neutral" | "success";
}) {
  const tones = {
    coffee: "bg-coffee-800 text-cream-50 border-coffee-800",
    accent: "bg-accent-500/10 text-accent-600 border-accent-500/25",
    neutral: "bg-white text-coffee-700 border-cream-200",
    success: "bg-success-500/10 text-success-500 border-success-500/20",
  } as const;

  return (
    <div
      className={cn(
        "relative flex flex-wrap items-center gap-2 rounded-2xl border p-4 sm:p-5",
        tones[tone],
      )}
    >
      {icon}
      <span className="text-[11px] font-medium opacity-80">{label}</span>
      <span className="mt-2 block w-full text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
    </div>
  );
}
