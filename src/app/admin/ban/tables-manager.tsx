"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CircleAlert,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { Area, CoffeeTable } from "@/lib/types";
import {
  deleteAreaAction,
  deleteTableAction,
  saveAreaAction,
  saveTableAction,
  setTableStatusAction,
} from "./actions";

type TableForm = {
  id?: string;
  area_id: string;
  name: string;
  seats: string;
  is_active: boolean;
};

type AreaForm = { id?: string; name: string; sort_order: number };

export function TablesManager({
  areas,
  tables,
}: {
  areas: Area[];
  tables: CoffeeTable[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tableModal, setTableModal] = useState<TableForm | null>(null);
  const [areaModal, setAreaModal] = useState<AreaForm | null>(null);
  const [confirm, setConfirm] = useState<
    { type: "table" | "area"; id: string; name: string } | null
  >(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function flash(message: string, isError = false) {
    if (timer.current) clearTimeout(timer.current);
    if (isError) {
      setError(message);
      setNotice(null);
    } else {
      setNotice(message);
      setError(null);
    }
    timer.current = setTimeout(() => {
      setError(null);
      setNotice(null);
    }, 4000);
  }

  const grouped = useMemo(() => {
    const groups = areas.map((area) => ({
      area,
      tables: tables.filter((table) => table.area_id === area.id),
    }));
    const unassigned = tables.filter(
      (table) => !table.area_id || !areas.some((area) => area.id === table.area_id),
    );
    if (unassigned.length > 0) {
      groups.push({
        area: { id: "none", name: "Chưa xếp khu vực", sort_order: 999 },
        tables: unassigned,
      });
    }
    return groups;
  }, [areas, tables]);

  function openNewTable(areaId?: string) {
    setTableModal({
      area_id: areaId ?? areas[0]?.id ?? "",
      name: "",
      seats: "4",
      is_active: true,
    });
  }

  function saveTable() {
    if (!tableModal) return;
    startTransition(async () => {
      const result = await saveTableAction({
        id: tableModal.id,
        area_id: tableModal.area_id || null,
        name: tableModal.name,
        seats: Number(tableModal.seats) || 4,
        is_active: tableModal.is_active,
      });
      if (!result.ok) {
        flash(result.error, true);
        return;
      }
      setTableModal(null);
      flash(tableModal.id ? "Đã cập nhật bàn." : "Đã thêm bàn mới.");
    });
  }

  function saveArea() {
    if (!areaModal) return;
    startTransition(async () => {
      const result = await saveAreaAction(areaModal);
      if (!result.ok) {
        flash(result.error, true);
        return;
      }
      setAreaModal(null);
      flash("Đã lưu khu vực.");
    });
  }

  function runConfirm() {
    if (!confirm) return;
    const target = confirm;
    startTransition(async () => {
      const result =
        target.type === "table"
          ? await deleteTableAction(target.id)
          : await deleteAreaAction(target.id);
      if (!result.ok) {
        flash(result.error, true);
        return;
      }
      setConfirm(null);
      flash("Đã xoá.");
    });
  }

  function changeStatus(table: CoffeeTable, status: "empty" | "reserved") {
    startTransition(async () => {
      const result = await setTableStatusAction(table.id, status);
      if (!result.ok) flash(result.error, true);
    });
  }

  return (
    <div>
      <PageHeader
        title="Bàn & khu vực"
        description={`${areas.length} khu vực · ${tables.length} bàn`}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setAreaModal({ name: "", sort_order: areas.length + 1 })}
            >
              <Plus className="h-4 w-4" /> Khu vực
            </Button>
            <Button onClick={() => openNewTable()}>
              <Plus className="h-4 w-4" /> Thêm bàn
            </Button>
          </div>
        }
      />

      {error ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-xl border border-danger-500/25 bg-danger-500/8 px-4 py-3 text-sm font-medium text-danger-500"
        >
          <CircleAlert className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-xl border border-success-500/25 bg-success-500/10 px-4 py-3 text-sm font-medium text-success-500">
          {notice}
        </div>
      ) : null}

      {areas.length === 0 && tables.length === 0 ? (
        <Card>
          <EmptyState
            title="Chưa có khu vực hay bàn nào"
            description="Tạo khu vực trước (ví dụ Tầng 1, Sân vườn), sau đó thêm bàn."
            action={
              <Button onClick={() => setAreaModal({ name: "", sort_order: 1 })}>
                <Plus className="h-4 w-4" /> Tạo khu vực
              </Button>
            }
          />
        </Card>
      ) : null}

      <div className="space-y-4">
        {grouped.map(({ area, tables: areaTables }) => (
          <Card key={area.id}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  {area.name}
                  <Badge tone="neutral">{areaTables.length} bàn</Badge>
                </span>
              }
              description={
                area.id === "none" ? "Gán khu vực cho các bàn này." : undefined
              }
              action={
                area.id === "none" ? undefined : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openNewTable(area.id)}
                      className="rounded-lg p-1.5 text-mocha-400 transition-colors hover:bg-cream-100 hover:text-coffee-700"
                      aria-label={`Thêm bàn vào ${area.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAreaModal({
                          id: area.id,
                          name: area.name,
                          sort_order: area.sort_order,
                        })
                      }
                      className="rounded-lg p-1.5 text-mocha-400 transition-colors hover:bg-cream-100 hover:text-coffee-700"
                      aria-label={`Sửa ${area.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({ type: "area", id: area.id, name: area.name })
                      }
                      className="rounded-lg p-1.5 text-mocha-400 transition-colors hover:bg-danger-500/10 hover:text-danger-500"
                      aria-label={`Xoá ${area.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              }
            />

            {areaTables.length === 0 ? (
              <EmptyState
                title="Khu vực chưa có bàn"
                action={
                  <Button size="sm" variant="secondary" onClick={() => openNewTable(area.id)}>
                    <Plus className="h-3.5 w-3.5" /> Thêm bàn
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {areaTables.map((table) => (
                  <div
                    key={table.id}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      table.is_active
                        ? "border-cream-200 bg-white"
                        : "border-dashed border-cream-300 bg-cream-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-coffee-900">
                          {table.name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-mocha-400">
                          <Users className="h-3 w-3" /> {table.seats} chỗ
                        </p>
                      </div>
                      <Badge
                        tone={
                          !table.is_active
                            ? "neutral"
                            : table.status === "busy"
                              ? "accent"
                              : table.status === "reserved"
                                ? "warning"
                                : "success"
                        }
                      >
                        {!table.is_active
                          ? "Ngưng dùng"
                          : table.status === "busy"
                            ? "Có khách"
                            : table.status === "reserved"
                              ? "Đặt trước"
                              : "Trống"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-cream-100 pt-2.5">
                      <div className="flex items-center gap-1">
                        {table.status === "empty" && table.is_active ? (
                          <button
                            type="button"
                            onClick={() => changeStatus(table, "reserved")}
                            disabled={pending}
                            className="rounded-md px-1.5 py-1 text-[11px] font-medium text-mocha-400 hover:bg-cream-100 hover:text-coffee-700"
                          >
                            Đặt trước
                          </button>
                        ) : null}
                        {table.status === "reserved" ? (
                          <button
                            type="button"
                            onClick={() => changeStatus(table, "empty")}
                            disabled={pending}
                            className="rounded-md px-1.5 py-1 text-[11px] font-medium text-accent-600 hover:bg-accent-500/10"
                          >
                            Bỏ đặt
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTableModal({
                              id: table.id,
                              area_id: table.area_id ?? "",
                              name: table.name,
                              seats: String(table.seats),
                              is_active: table.is_active,
                            });
                          }}
                          className="rounded-lg p-1.5 text-mocha-400 hover:bg-cream-100 hover:text-coffee-700"
                          aria-label={`Sửa ${table.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({ type: "table", id: table.id, name: table.name })
                          }
                          className="rounded-lg p-1.5 text-mocha-400 hover:bg-danger-500/10 hover:text-danger-500"
                          aria-label={`Xoá ${table.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Table modal */}
      <Modal
        open={tableModal !== null}
        onClose={() => setTableModal(null)}
        title={tableModal?.id ? "Sửa bàn" : "Thêm bàn"}
        size="sm"
      >
        {tableModal ? (
          <div className="space-y-3">
            <Field label="Tên bàn">
              <Input
                value={tableModal.name}
                onChange={(event) =>
                  setTableModal({ ...tableModal, name: event.target.value })
                }
                placeholder="B01"
                maxLength={20}
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Khu vực">
                <Select
                  value={tableModal.area_id}
                  onChange={(event) =>
                    setTableModal({ ...tableModal, area_id: event.target.value })
                  }
                >
                  <option value="">Chưa xếp</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Số chỗ">
                <Input
                  inputMode="numeric"
                  value={tableModal.seats}
                  onChange={(event) =>
                    setTableModal({ ...tableModal, seats: event.target.value })
                  }
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-coffee-700">
              <input
                type="checkbox"
                checked={tableModal.is_active}
                onChange={(event) =>
                  setTableModal({ ...tableModal, is_active: event.target.checked })
                }
                className="h-4 w-4 rounded border-cream-300 accent-coffee-700"
              />
              Đang sử dụng
            </label>
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setTableModal(null)}
                disabled={pending}
              >
                Huỷ
              </Button>
              <Button
                className="flex-1"
                onClick={saveTable}
                disabled={pending || !tableModal.name.trim()}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Lưu bàn
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Area modal */}
      <Modal
        open={areaModal !== null}
        onClose={() => setAreaModal(null)}
        title={areaModal?.id ? "Sửa khu vực" : "Thêm khu vực"}
        size="sm"
      >
        {areaModal ? (
          <div className="space-y-3">
            <Field label="Tên khu vực">
              <Input
                value={areaModal.name}
                onChange={(event) =>
                  setAreaModal({ ...areaModal, name: event.target.value })
                }
                placeholder="Tầng 1"
                maxLength={40}
                autoFocus
              />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setAreaModal(null)}
                disabled={pending}
              >
                Huỷ
              </Button>
              <Button
                className="flex-1"
                onClick={saveArea}
                disabled={pending || !areaModal.name.trim()}
              >
                Lưu khu vực
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirm */}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.type === "table" ? "Xoá bàn?" : "Xoá khu vực?"}
        description={
          confirm?.type === "table"
            ? `Bàn "${confirm.name}" sẽ bị xoá khỏi sơ đồ.`
            : `Khu vực "${confirm?.name}" sẽ bị xoá.`
        }
        size="sm"
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirm(null)}
            disabled={pending}
          >
            Giữ lại
          </Button>
          <Button variant="danger" className="flex-1" onClick={runConfirm} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Xoá
          </Button>
        </div>
      </Modal>
    </div>
  );
}
