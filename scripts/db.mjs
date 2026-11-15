// Chạy SQL trực tiếp lên Supabase qua DATABASE_URL trong .env.local
// Dùng: node scripts/db.mjs supabase/schema.sql
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

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

const file = process.argv[2];
if (!file) {
  console.error("Thiếu đường dẫn file SQL. Ví dụ: node scripts/db.mjs supabase/schema.sql");
  process.exit(1);
}

const sql = readFileSync(path.resolve(process.cwd(), file), "utf8");
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Đã kết nối Supabase. Đang chạy", file, "...");
await client.query(sql);
console.log("Xong.");
await client.end();
