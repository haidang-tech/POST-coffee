import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client dùng service_role — CHỈ gọi trong server action / route handler.
 * Tuyệt đối không import file này từ component phía client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("MISSING_SERVICE_ROLE_KEY");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
