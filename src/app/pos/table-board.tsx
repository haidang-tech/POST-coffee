"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { openTableAction } from "./actions";
import { Badge, EmptyState } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Area, CoffeeTable } from "@/lib/types";

type OpenOrder = {
  id: string;
  table_id: string | null;
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
    return list.map((area) => ({
      area,
      tables: tables.filter((table) => !areas.length || table.area_id === area.id),
    }));
  }, [areas, tables]);

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-600">
          Ca làm việc
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-coffee-900">Sơ đồ bàn</h1>
        <p className="mt-1 text-sm text-mocha-400">
          Chọn bàn để bắt đầu thêm món hoặc tiếp tục đơn đang mở.
        </p>
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
                  const isBusy = Boolean(order) || table.status === "busy";
                  const isLoading = pending && busyTable === table.id;

                  return (
                    <div
                      key={table.id}
                      className={cn(
                        "group relative flex min-h-40 flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 sm:min-h-44",
                        isBusy &&
                          "border-coffee-800 bg-coffee-800 text-cream-50 shadow-[0_8px_20px_rgba(23,36,26,0.18)] hover:shadow-[0_12px_24px_rgba(23,36,26,0.24)]",
                        !isBusy &&
                          "border-cream-300 bg-white shadow-[0_4px_14px_rgba(23,36,26,0.10)] hover:-translate-y-0.5 hover:border-success-500 hover:shadow-[0_10px_22px_rgba(23,36,26,0.16)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openOrView(table)}
                        disabled={pending}
                        className="flex flex-1 flex-col items-start gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 disabled:opacity-70 sm:p-4"
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-xl font-semibold tracking-tight",
                              isBusy ? "text-cream-50" : "text-coffee-900",
                            )}
                          >
                            {table.name}
                          </span>
                          {isLoading ? (
                            <Loader2
                              className={cn(
                                "h-4 w-4 animate-spin",
                                isBusy ? "text-cream-100" : "text-mocha-400",
                              )}
                            />
                          ) : (
                            <Badge
                              tone={isBusy ? "accent" : "neutral"}
                              className={isBusy ? "border-cream-200/25" : ""}
                            >
                              {isBusy ? "Đang mở" : "Trống"}
                            </Badge>
                          )}
                        </div>

                        {order ? (
                          <div className="mt-auto w-full border-t border-cream-200/20 pt-2.5">
                            <span className="text-xs font-medium text-cream-100">
                              Chọn để thêm món
                            </span>
                          </div>
                        ) : (
                          <span className="mt-auto text-xs font-medium text-mocha-400">
                            Chọn bàn để thêm món
                          </span>
                        )}
                      </button>
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
