"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Armchair, CircleAlert, Loader2 } from "lucide-react";
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
  const [selectedArea, setSelectedArea] = useState("all");
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
    return list
      .filter((area) => selectedArea === "all" || area.id === selectedArea)
      .map((area) => ({
        area,
        tables: tables.filter((table) => !areas.length || table.area_id === area.id),
      }));
  }, [areas, tables, selectedArea]);

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

      <div className="space-y-5 rounded-2xl border border-cream-200 bg-white p-3 shadow-sm sm:p-5">
        {areas.length > 1 ? (
          <div
            className="flex gap-2 overflow-x-auto border-b border-cream-200 pb-3"
            aria-label="Chọn khu vực"
          >
            {[
              { id: "all", name: "Tất cả" },
              ...areas.map(({ id, name }) => ({ id, name })),
            ].map((area) => (
              <button
                key={area.id}
                type="button"
                aria-pressed={selectedArea === area.id}
                onClick={() => setSelectedArea(area.id)}
                className={cn(
                  "min-h-10 shrink-0 rounded-lg border px-4 text-sm font-medium transition-colors",
                  selectedArea === area.id
                    ? "border-coffee-800 bg-coffee-800 text-white"
                    : "border-cream-200 bg-white text-coffee-700 hover:bg-cream-50",
                )}
              >
                {area.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-mocha-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success-500" />
            Trống
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger-500" />
            Đang mở
          </span>
        </div>

        <div className="space-y-6">
          {grouped.map(({ area, tables: areaTables }) =>
            areaTables.length === 0 ? null : (
              <section key={area.id}>
                {areas.length > 1 ? (
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-coffee-700">
                      {area.name}
                    </h2>
                    <span className="h-px flex-1 bg-cream-200" />
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {areaTables.map((table) => {
                    const order = orderByTable.get(table.id);
                    const isBusy = Boolean(order) || table.status === "busy";
                    const isLoading = pending && busyTable === table.id;

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => openOrView(table)}
                        disabled={pending}
                        aria-label={`Bàn ${table.name}, ${isBusy ? "đang mở" : "trống"}`}
                        className={cn(
                          "flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 bg-white p-3 text-center shadow-[0_3px_12px_rgba(23,36,26,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(23,36,26,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 disabled:opacity-70 sm:min-h-40",
                          isBusy
                            ? "border-danger-500/60 hover:border-danger-500"
                            : "border-success-500/70 hover:border-success-500",
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-accent-600" />
                        ) : (
                          <Armchair
                            className={cn(
                              "h-6 w-6",
                              isBusy ? "text-danger-500" : "text-coffee-600",
                            )}
                          />
                        )}
                        <span className="text-base font-semibold text-coffee-900">
                          {table.name}
                        </span>
                        <Badge tone={isBusy ? "danger" : "success"}>
                          {isBusy ? "Đang mở" : "Trống"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </section>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
