// Tạo / nâng quyền tài khoản admin đầu tiên.
// Dùng: node scripts/create-admin.mjs <email> <mat-khau> [ho-ten]
// Yêu cầu SUPABASE_SERVICE_ROLE_KEY trong .env.local
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

loadEnvLocal();

const [email, password, fullName = "Quản trị viên"] = process.argv.slice(2);
if (!email || !password) {
  console.error("Dùng: node scripts/create-admin.mjs <email> <mat-khau> [ho-ten]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId;

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (createError) {
  if (!createError.message.toLowerCase().includes("already")) {
    console.error("Không tạo được user:", createError.message);
    process.exit(1);
  }

  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    console.error("Không đọc được danh sách user:", listError.message);
    process.exit(1);
  }
  const found = list.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!found) {
    console.error("Email đã tồn tại nhưng không tìm thấy user.");
    process.exit(1);
  }
  userId = found.id;
  console.log("User đã tồn tại, nâng quyền admin:", email);
} else {
  userId = created.user.id;
  console.log("Đã tạo user:", email);
}

const { error: profileError } = await admin
  .from("profiles")
  .update({ role: "admin", is_active: true, full_name: fullName })
  .eq("id", userId);

if (profileError) {
  console.error("Không cập nhật được profile:", profileError.message);
  process.exit(1);
}

console.log("Xong. Tài khoản admin:", email);
console.log("Hãy đổi mật khẩu sau lần đăng nhập đầu tiên.");
