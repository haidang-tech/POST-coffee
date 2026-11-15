"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CircleAlert,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { cn, vnd } from "@/lib/utils";
import type { Category, MenuItem } from "@/lib/types";
import {
  deleteCategoryAction,
  deleteMenuItemAction,
  saveCategoryAction,
  saveMenuItemAction,
  toggleMenuItemAction,
} from "./actions";

type ItemForm = {
  id?: string;
  name: string;
  category_id: string;
  description: string;
  price: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_FORM: ItemForm = {
  name: "",
  category_id: "",
  description: "",
  price: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function MenuManager({
  categories,
  items,
}: {
  categories: Category[];
  items: MenuItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [categoryModal, setCategoryModal] = useState<Category | "new" | null>(null);
  const [categoryName, setCategoryName] = useState("");

  const [confirm, setConfirm] = useState<
    { type: "item" | "category"; id: string; name: string } | null
  >(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) map.set(category.id, category.name);
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchCategory =
        filterCategory === "all" || item.category_id === filterCategory;
      const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [items, filterCategory, query]);

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

  function openNewItem() {
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id ?? "" });
    setFormOpen(true);
  }

  function openEditItem(item: MenuItem) {
    setForm({
      id: item.id,
      name: item.name,
      category_id: item.category_id ?? "",
      description: item.description,
      price: String(item.price),
      image_url: item.image_url ?? "",
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setFormOpen(true);
  }

  async function uploadImage(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      flash("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc AVIF.", true);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      flash("Ảnh tối đa 2MB.", true);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(path, file, { cacheControl: "31536000", contentType: file.type });

      if (uploadError) {
        flash("Tải ảnh thất bại. Kiểm tra quyền hoặc thử lại.", true);
        return;
      }

      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setForm((current) => ({ ...current, image_url: data.publicUrl }));
    } finally {
      setUploading(false);
    }
  }

  function saveItem() {
    startTransition(async () => {
      const result = await saveMenuItemAction({
        id: form.id,
        name: form.name,
        category_id: form.category_id || null,
        description: form.description,
        price: Number(form.price.replace(/[^\d]/g, "")),
        image_url: form.image_url || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
      });

      if (!result.ok) {
        flash(result.error, true);
        return;
      }
      setFormOpen(false);
      flash(form.id ? "Đã cập nhật món." : "Đã thêm món mới.");
    });
  }

  function saveCategory() {
    startTransition(async () => {
      const result = await saveCategoryAction({
        id: categoryModal === "new" ? undefined : categoryModal?.id,
        name: categoryName,
        sort_order:
          categoryModal === "new" ? categories.length + 1 : categoryModal?.sort_order ?? 0,
      });
      if (!result.ok) {
        flash(result.error, true);
        return;
      }
      setCategoryModal(null);
      flash("Đã lưu nhóm món.");
    });
  }

  function runConfirm() {
    if (!confirm) return;
    const target = confirm;
    startTransition(async () => {
      const result =
        target.type === "item"
          ? await deleteMenuItemAction(target.id)
          : await deleteCategoryAction(target.id);
      if (!result.ok) {
        flash(result.error, true);
        return;
      }
      setConfirm(null);
      flash(target.type === "item" ? "Đã xoá món." : "Đã xoá nhóm món.");
    });
  }

  const activeCount = items.filter((item) => item.is_active).length;

  return (
    <div>
      <PageHeader
        title="Thực đơn"
        description={`${items.length} món · ${activeCount} đang bán · ${categories.length} nhóm`}
        action={
          <Button onClick={openNewItem}>
            <Plus className="h-4 w-4" /> Thêm món
          </Button>
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

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm món…"
              className="border-transparent bg-cream-50 pl-10 focus:border-coffee-500 focus:bg-white"
            />
          </div>
          <Select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            className="sm:w-52"
            aria-label="Lọc theo nhóm"
          >
            <option value="all">Tất cả nhóm</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader
            title="Danh sách món"
            description="Bấm vào món để sửa nhanh thông tin."
          />
          {filtered.length === 0 ? (
            <EmptyState
              title="Chưa có món nào"
              description="Thêm món đầu tiên để bắt đầu bán hàng."
              action={
                <Button size="sm" onClick={openNewItem}>
                  <Plus className="h-3.5 w-3.5" /> Thêm món
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-cream-200">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cream-50"
                >
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-mocha-400">
                      <UtensilsCrossed className="h-4 w-4" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-coffee-900">
                        {item.name}
                      </p>
                      {item.is_active ? (
                        <Badge tone="success">Đang bán</Badge>
                      ) : (
                        <Badge tone="neutral">Tạm ngừng</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-mocha-400">
                      {categoryNameById.get(item.category_id ?? "") ?? "Chưa phân nhóm"}
                      {item.description ? ` · ${item.description}` : ""}
                    </p>
                  </div>

                  <span className="hidden shrink-0 text-sm font-semibold tabular-nums text-coffee-800 sm:block">
                    {vnd(item.price)}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditItem(item)}
                      className="rounded-lg p-2 text-mocha-400 transition-colors hover:bg-cream-100 hover:text-coffee-700"
                      aria-label={`Sửa ${item.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(async () => {
                          const result = await toggleMenuItemAction(
                            item.id,
                            !item.is_active,
                          );
                          if (!result.ok) flash(result.error, true);
                        });
                      }}
                      disabled={pending}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        item.is_active ? "bg-success-500" : "bg-cream-300",
                      )}
                      aria-label={item.is_active ? "Tạm ngừng bán" : "Bật bán lại"}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                          item.is_active ? "left-[22px]" : "left-0.5",
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({ type: "item", id: item.id, name: item.name })
                      }
                      className="rounded-lg p-2 text-mocha-400 transition-colors hover:bg-danger-500/10 hover:text-danger-500"
                      aria-label={`Xoá ${item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader
            title="Nhóm món"
            description="Sắp xếp thực đơn theo nhóm."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCategoryName("");
                  setCategoryModal("new");
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Thêm
              </Button>
            }
          />
          {categories.length === 0 ? (
            <EmptyState title="Chưa có nhóm món" />
          ) : (
            <ul className="divide-y divide-cream-200">
              {categories.map((category) => {
                const count = items.filter(
                  (item) => item.category_id === category.id,
                ).length;
                return (
                  <li
                    key={category.id}
                    className="flex items-center justify-between gap-2 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-coffee-900">
                        {category.name}
                      </p>
                      <p className="text-[11px] text-mocha-400">{count} món</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryName(category.name);
                          setCategoryModal(category);
                        }}
                        className="rounded-lg p-1.5 text-mocha-400 hover:bg-cream-100 hover:text-coffee-700"
                        aria-label={`Sửa nhóm ${category.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            type: "category",
                            id: category.id,
                            name: category.name,
                          })
                        }
                        className="rounded-lg p-1.5 text-mocha-400 hover:bg-danger-500/10 hover:text-danger-500"
                        aria-label={`Xoá nhóm ${category.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Item form */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? "Sửa món" : "Thêm món"}
        description="Thông tin hiển thị trên màn hình bán hàng."
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên món" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Cà phê sữa"
                maxLength={80}
              />
            </Field>

            <Field label="Nhóm">
              <Select
                value={form.category_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category_id: event.target.value,
                  }))
                }
              >
                <option value="">Chưa phân nhóm</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Giá" hint="Đơn vị VND">
              <Input
                inputMode="numeric"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({ ...current, price: event.target.value }))
                }
                placeholder="29000"
              />
            </Field>

            <Field label="Mô tả" className="sm:col-span-2">
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                maxLength={300}
                placeholder="Phin đen kết hợp sữa đặc"
              />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-coffee-700">Ảnh món</p>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <Image
                  src={form.image_url}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-cream-100 text-mocha-400">
                  <ImagePlus className="h-5 w-5" />
                </span>
              )}
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                    event.target.value = "";
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    {form.image_url ? "Đổi ảnh" : "Tải ảnh"}
                  </Button>
                  {form.image_url ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm((current) => ({ ...current, image_url: "" }))
                      }
                    >
                      Bỏ ảnh
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-mocha-400">JPG/PNG/WEBP, tối đa 2MB.</p>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-coffee-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-cream-300 accent-coffee-700"
            />
            Đang bán (bỏ chọn để tạm ngừng)
          </label>

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setFormOpen(false)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button
              className="flex-1"
              onClick={saveItem}
              disabled={pending || uploading || !form.name.trim()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu món
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category modal */}
      <Modal
        open={categoryModal !== null}
        onClose={() => setCategoryModal(null)}
        title={categoryModal === "new" ? "Thêm nhóm món" : "Sửa nhóm món"}
        size="sm"
      >
        <div className="space-y-3">
          <Field label="Tên nhóm">
            <Input
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Cà phê"
              maxLength={40}
              autoFocus
            />
          </Field>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setCategoryModal(null)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button
              className="flex-1"
              onClick={saveCategory}
              disabled={pending || !categoryName.trim()}
            >
              Lưu
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.type === "item" ? "Xoá món?" : "Xoá nhóm món?"}
        description={
          confirm?.type === "item"
            ? `"${confirm.name}" sẽ bị xoá khỏi thực đơn. Hoá đơn cũ vẫn giữ tên món.`
            : `"${confirm?.name}" sẽ bị xoá. Các món trong nhóm chuyển về "Chưa phân nhóm".`
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
