# POST Coffee — Web quản lý quán

Ứng dụng bán hàng nội bộ cho quán cà phê: sơ đồ bàn, gọi món, thanh toán, quản lý
thực đơn, nhân viên và báo cáo doanh thu.

- **Next.js 15** (App Router, Server Actions) + TypeScript
- **Tailwind CSS v4** — giao diện tiếng Việt, tối ưu cho màn hình cảm ứng
- **Supabase** — Postgres + Auth + Storage + Realtime, **RLS bật toàn bộ**
- **Vercel** — deploy production & preview

---

## Tính năng

**Bán hàng (POS)** — `/pos`

- Sơ đồ bàn theo khu vực, trạng thái trống / có khách / đặt trước
- Đồng bộ realtime khi nhiều thiết bị cùng mở
- Mở đơn theo bàn, thêm món, tăng giảm số lượng, ghi chú từng món
- Chuyển bàn, gộp đơn, huỷ đơn
- Thanh toán: giảm giá nhanh, xác nhận thu tiền, in hoá đơn

**Quản lý** — `/admin` (chỉ admin)

- Dashboard: doanh thu hôm nay, 7 ngày, món bán chạy, đơn gần đây
- Thực đơn: nhóm món, món, giá, ảnh (Supabase Storage), bật/tắt bán
- Bàn & khu vực: CRUD, đổi trạng thái
- Đơn hàng: lọc theo thời gian / trạng thái, in lại hoá đơn
- Nhân viên: tạo tài khoản, phân quyền admin/staff, khoá tài khoản
- Nhật ký: audit log 100 thao tác gần nhất

---

## Bắt đầu

### 1. Yêu cầu

- Node.js 20+
- Một project Supabase

### 2. Cài đặt

```bash
npm install
cp .env.example .env.local   # rồi điền giá trị thật
```

Lấy thông tin trong Supabase Dashboard:

| Biến | Vị trí |
| --- | --- |
| `DATABASE_URL` | Project Settings → Database → Connection string → **Session pooler** |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API → anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | API → service_role / secret key (**chỉ server**) |

### 3. Khởi tạo database

```bash
npm run db:push     # chạy supabase/schema.sql: bảng, RLS, RPC, seed mẫu
```

> ⚠️ `db:push` **xoá và tạo lại** toàn bộ bảng public. Chỉ chạy trên project
> mới. Trên production hãy dùng file trong `supabase/migrations/` với
> `npm run db:sql supabase/migrations/<file>.sql`.

### 4. Tạo tài khoản admin đầu tiên

```bash
npm run admin:create -- admin@postcoffee.vn "MatKhauThatManh123" "Quản trị viên"
```

Sau đó đăng nhập và **đổi mật khẩu** (Supabase Dashboard → Authentication).

### 5. Chạy dev

```bash
npm run dev
```

---

## Script

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run lint` | ESLint |
| `npm run db:push` | Chạy toàn bộ schema (xoá dữ liệu cũ) |
| `npm run db:sql <file>` | Chạy một file SQL bất kỳ |
| `npm run admin:create` | Tạo / nâng quyền admin |

---

## Kiến trúc dữ liệu

```
profiles(id → auth.users, full_name, role: admin|staff, is_active)
categories(id, name, sort_order)
menu_items(id, category_id, name, description, price, image_url, is_active)
areas(id, name, sort_order)
tables(id, area_id, name, seats, status: empty|busy|reserved, is_active)
orders(id, code, table_id, table_label, status: open|paid|cancelled,
       subtotal, discount, total, created_by, paid_by, paid_at)
order_items(id, order_id, menu_item_id, name_snapshot, unit_price, qty, note)
audit_log(id, actor, actor_name, action, entity, entity_id, detail, created_at)
```

Điểm quan trọng:

- `order_items.unit_price` và `name_snapshot` lưu **tại thời điểm gọi món**, nên
  đổi giá/tên món sau này không làm sai hoá đơn cũ.
- Tổng tiền được tính lại bằng trigger trong database (`recalc_order`), không
  tin số liệu từ client.
- `orders.code` sinh từ sequence, không đoán được.

---

## Bảo mật (NFR)

### Phân quyền 3 lớp

1. **Middleware** chặn chưa đăng nhập khỏi `/pos`, `/admin`.
2. **Layout server** kiểm tra `profiles.role` + `is_active`.
3. **RLS + RPC** trong Postgres là lớp cuối: dù gọi thẳng API Supabase cũng
   không vượt được.

### Nguyên tắc đã áp dụng

- **RLS bật trên 100% bảng**, không có bảng nào tin client.
- Bảng `orders` / `order_items` **không có policy ghi**: mọi thay đổi đi qua
  function `security definer` (`pos_*`) có kiểm tra quyền, trạng thái đơn và
  validate số lượng/giảm giá.
- `orders` chỉ đọc được khi profile `is_active` — khoá tài khoản là mất quyền
  ngay, kể cả khi còn session.
- Không thể tự nâng quyền: `profiles` không có policy update; đổi quyền chỉ qua
  `admin_set_member()` và chặn tự hạ quyền chính mình.
- **`service_role` key** chỉ dùng ở server (`src/lib/supabase/admin.ts` có
  `import "server-only"`), không bao giờ lọt vào bundle client.
- Mọi server action validate bằng **Zod** + kiểm tra UUID trước khi gọi DB.
- **Audit log** ghi tự động bằng trigger, client không có quyền insert.
- HTTP headers: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`.
- Ảnh món chỉ nhận URL thuộc bucket `menu-images` của project (chống chèn URL
  ngoài).
- Rate limit đăng nhập (8 lần/phút/IP) — xem mục giới hạn bên dưới.

### Checklist trước khi lên production

- [ ] Đổi mật khẩu database Supabase và **xoá mật khẩu cũ khỏi mọi nơi** nếu
      từng chia sẻ qua chat/log.
- [ ] Đặt `Site URL` + `Redirect URLs` trong Supabase Auth đúng domain Vercel.
- [ ] Bật **Leaked Password Protection** trong Supabase Auth.
- [ ] Cân nhắc tắt signup công khai (Authentication → Providers → Email →
      Disable signup) — tài khoản do admin tạo.
- [ ] Env vars trên Vercel: chỉ set `NEXT_PUBLIC_*` cho cả 3 môi trường,
      `SUPABASE_SERVICE_ROLE_KEY` chỉ ở Production/Preview (server-side).
- [ ] Bật Vercel **Deployment Protection** cho preview nếu cần.
- [ ] Kiểm tra `curl -I https://<domain>` thấy đủ security headers.
- [ ] Thử đăng nhập sai 9 lần → bị chặn tạm.
- [ ] Kiểm tra staff không mở được `/admin` và không gọi được `admin_set_member`.

### Giới hạn đã biết

- Rate limit đăng nhập lưu **trong bộ nhớ** mỗi instance serverless. Muốn chính
  xác trên nhiều instance, thay bằng **Upstash Redis** trong
  `src/lib/rate-limit.ts`.
- CSP dùng `'unsafe-inline'` cho script vì Next.js chèn inline RSC payload. Có
  thể nâng cấp lên CSP **nonce** trong `middleware.ts` nếu cần siết hơn.
- Chưa có 2FA và chưa có luồng tự đổi mật khẩu trong app (dùng Supabase
  Dashboard hoặc thêm trang `/tai-khoan` sau).

---

## Deploy Vercel

1. Import repo `haidang-tech/Post-coffee` vào Vercel (framework: Next.js).
2. Thêm 4 biến môi trường ở trên (Production + Preview).
3. Deploy. `DATABASE_URL` không cần cho runtime — chỉ dùng cho script migration,
   nhưng giữ trên máy local là đủ.
4. Trong Supabase Auth → URL Configuration: thêm domain Vercel vào `Site URL` và
   `Redirect URLs`.
5. Tạo admin trên production bằng `npm run admin:create` (chạy local trỏ vào
   project production) hoặc qua Dashboard.

---

## Cấu trúc thư mục

```
src/
  app/
    login/                 # đăng nhập (server action + rate limit)
    pos/                   # sơ đồ bàn, order screen, in hoá đơn
      ban/[id]/            # màn hình order của một bàn
      hoa-don/[id]/        # hoá đơn in
    admin/                 # dashboard + quản lý món/bàn/đơn/nhân viên/nhật ký
  components/
    ui/                    # button, input, card, modal
    pos/, admin/           # component theo khu vực
  lib/
    supabase/              # client / server / admin (service role)
    auth.ts                # requireStaff / requireAdmin
    validation.ts          # Zod schema dùng chung
    rate-limit.ts
    errors.ts              # map lỗi DB → thông báo tiếng Việt
supabase/
  schema.sql               # schema + RLS + RPC + seed (reset toàn bộ)
  migrations/              # thay đổi tăng dần cho production
scripts/
  db.mjs                   # chạy SQL qua DATABASE_URL
  create-admin.mjs         # tạo/nâng quyền admin
```

---

## Hướng phát triển

- Đặt bàn trước có lịch (reservation)
- Cổng thanh toán VietQR / VNPay / MoMo
- Quản lý tồn kho nguyên liệu, công thức pha chế
- Nhiều chi nhánh (thêm `shop_id` + RLS theo shop)
- Báo cáo theo ca làm, xuất Excel
- PWA để dùng offline trên tablet
