import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { formatDateTimeVN } from "@/lib/utils";
import type { AuditEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

const ENTITY_LABEL: Record<string, string> = {
  order: "Đơn hàng",
  profile: "Nhân viên",
  menu_item: "Món",
};

export default async function AuditPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_name, action, entity, entity_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const entries = (data ?? []) as AuditEntry[];

  return (
    <div>
      <PageHeader
        title="Nhật ký hoạt động"
        description="100 thao tác gần nhất trên hệ thống."
      />

      <Card>
        <CardHeader
          title="Lịch sử"
          description="Ghi nhận tự động từ database, không thể sửa hoặc xoá từ giao diện."
        />
        {entries.length === 0 ? (
          <EmptyState
            title="Chưa có hoạt động"
            description="Mọi thao tác tạo đơn, thanh toán, đổi quyền sẽ được ghi tại đây."
          />
        ) : (
          <ul className="divide-y divide-cream-200">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-100 text-[11px] font-semibold uppercase text-coffee-700">
                  {entry.actor_name?.slice(0, 1) || "?"}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-coffee-900">
                    <span className="font-semibold">{entry.actor_name || "Hệ thống"}</span>{" "}
                    <span className="text-mocha-400">·</span> {entry.action}
                    {entry.entity_id ? (
                      <span className="ml-1 font-mono text-[11px] text-mocha-400">
                        {entry.entity_id.slice(0, 8)}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">
                      {ENTITY_LABEL[entry.entity] ?? entry.entity}
                    </Badge>
                    {Object.entries(entry.detail ?? {})
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-md bg-cream-50 px-1.5 py-0.5 text-[10px] text-mocha-400"
                        >
                          {key}: <span className="text-coffee-700">{String(value)}</span>
                        </span>
                      ))}
                  </div>
                </div>

                <span className="shrink-0 text-[11px] tabular-nums text-mocha-400">
                  {formatDateTimeVN(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
