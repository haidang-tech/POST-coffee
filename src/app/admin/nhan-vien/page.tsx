import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { StaffManager } from "./staff-manager";

export const dynamic = "force-dynamic";

export default async function StaffAdminPage() {
  const { userId } = await requireAdmin();
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("created_at");

  const emails: Record<string, string> = {};
  let canCreateAccounts = true;

  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const user of data?.users ?? []) {
      if (user.email) emails[user.id] = user.email;
    }
  } catch {
    canCreateAccounts = false;
  }

  return (
    <StaffManager
      profiles={(profiles ?? []) as Profile[]}
      emails={emails}
      currentUserId={userId}
      canCreateAccounts={canCreateAccounts}
    />
  );
}
