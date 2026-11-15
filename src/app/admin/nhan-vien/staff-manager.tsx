"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CircleAlert,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatDateVN } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { createStaffAction, updateMemberAction } from "./actions";

export function StaffManager({
  profiles,
  emails,
  currentUserId,
  canCreateAccounts,
}: {
  profiles: Profile[];
  emails: Record<string, string>;
  currentUserId: string;
  canCreateAccounts: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", password: "" });

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
    }, 4500);
  }

  function createStaff() {
    startTransition(async () => {
      const result = await createStaffAction(form);
      if (!result.ok) {
        flash(result.error, true);
        return;
      }
      setCreateOpen(false);
      setForm({ email: "", full_name: "", password: "" });
      flash("Đã tạo tài khoản nhân viên. Hãy gửi email và mật khẩu cho họ.");
    });
  }

  function update(
    profile: Profile,
    changes: { role?: Profile["role"]; is_active?: boolean },
  ) {
    startTransition(async () => {
      const result = await updateMemberAction({
        user_id: profile.id,
        role: changes.role ?? profile.role,
        is_active: changes.is_active ?? profile.is_active,
      });
      if (!result.ok) {
        flash(result.error, true);
        return;
      }
      flash("Đã cập nhật quyền.");
    });
  }

  const admins = profiles.filter((profile) => profile.role === "admin").length;

  return (
    <div>
      <PageHeader
        title="Nhân viên"
        description={`${profiles.length} tài khoản · ${admins} quản trị viên`}
        action={
          <Button onClick={() => setCreateOpen(true)} disabled={!canCreateAccounts}>
            <Plus className="h-4 w-4" /> Thêm nhân viên
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

      {!canCreateAccounts ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning-500/25 bg-warning-500/10 px-4 py-3 text-xs text-[#8a6110]">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Chưa cấu hình <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          nên không thể tạo tài khoản mới từ giao diện. Xem README mục cấu hình.
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="Tài khoản"
          description="Phân quyền admin / nhân viên và khoá tài khoản khi cần."
        />
        {profiles.length === 0 ? (
          <EmptyState title="Chưa có nhân viên" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-[11px] uppercase tracking-[0.14em] text-mocha-400">
                  <th className="px-5 py-2.5 font-medium">Nhân viên</th>
                  <th className="px-5 py-2.5 font-medium">Vai trò</th>
                  <th className="px-5 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-5 py-2.5 font-medium">Tham gia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {profiles.map((profile) => {
                  const isSelf = profile.id === currentUserId;
                  return (
                    <tr key={profile.id} className="hover:bg-cream-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-100 text-coffee-700">
                            {profile.role === "admin" ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <UserRound className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-semibold text-coffee-900">
                              {profile.full_name || "Chưa đặt tên"}
                              {isSelf ? <Badge tone="accent">Bạn</Badge> : null}
                            </p>
                            <p className="truncate text-[11px] text-mocha-400">
                              {emails[profile.id] ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Select
                          value={profile.role}
                          disabled={pending || isSelf}
                          onChange={(event) =>
                            update(profile, {
                              role: event.target.value as Profile["role"],
                            })
                          }
                          className="h-9 w-32 text-xs"
                        >
                          <option value="staff">Nhân viên</option>
                          <option value="admin">Quản trị</option>
                        </Select>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            update(profile, { is_active: !profile.is_active })
                          }
                          disabled={pending || isSelf}
                          className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                            profile.is_active ? "bg-success-500" : "bg-cream-300"
                          }`}
                          aria-label={profile.is_active ? "Khoá tài khoản" : "Mở tài khoản"}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                              profile.is_active ? "left-[22px]" : "left-0.5"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-mocha-400">
                        {formatDateVN(profile.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-[11px] leading-relaxed text-mocha-400">
        Nhân viên bị khoá sẽ không gọi được API (RLS chặn theo profile) kể cả khi
        còn phiên đăng nhập. Không thể tự hạ quyền chính mình.
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Thêm nhân viên"
        description="Tài khoản được tạo với vai trò nhân viên, có thể nâng quyền sau."
        size="sm"
      >
        <div className="space-y-3">
          <Field label="Họ tên">
            <Input
              value={form.full_name}
              onChange={(event) =>
                setForm({ ...form, full_name: event.target.value })
              }
              placeholder="Nguyễn Minh Anh"
              maxLength={60}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="nhanvien@postcoffee.vn"
            />
          </Field>
          <Field label="Mật khẩu ban đầu" hint="Tối thiểu 8 ký tự. Gửi riêng cho nhân viên.">
            <Input
              type="text"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="••••••••"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setCreateOpen(false)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button
              className="flex-1"
              onClick={createStaff}
              disabled={
                pending ||
                !form.email.trim() ||
                !form.full_name.trim() ||
                form.password.length < 8
              }
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tạo tài khoản
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
