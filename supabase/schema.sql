-- POST Coffee — schema, RLS, RPC
-- Chạy: node scripts/db.mjs supabase/schema.sql
-- CẢNH BÁO: script này xoá và tạo lại toàn bộ bảng public.

create extension if not exists pgcrypto;

-- ============================================================
-- 0. Dọn dẹp (idempotent)
-- ============================================================
drop view if exists public.v_daily_revenue cascade;
drop view if exists public.v_top_items cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.tables cascade;
drop table if exists public.areas cascade;
drop table if exists public.menu_items cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
drop sequence if exists public.order_code_seq;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_staff() cascade;
drop function if exists public.current_role() cascade;
drop function if exists public.recalc_order(uuid) cascade;
drop function if exists public.log_audit(text, text, text, jsonb) cascade;
drop function if exists public.pos_create_order(uuid, text) cascade;
drop function if exists public.pos_add_item(uuid, uuid, int, text) cascade;
drop function if exists public.pos_update_item(uuid, int) cascade;
drop function if exists public.pos_remove_item(uuid) cascade;
drop function if exists public.pos_move_order(uuid, uuid) cascade;
drop function if exists public.pos_merge_orders(uuid, uuid) cascade;
drop function if exists public.pos_pay_order(uuid, int) cascade;
drop function if exists public.pos_cancel_order(uuid) cascade;
drop function if exists public.pos_set_table_status(uuid, text) cascade;
drop function if exists public.admin_set_member(uuid, text, boolean) cascade;

-- ============================================================
-- 1. Bảng
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'staff' check (role in ('admin','staff')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.categories(id) on delete set null,
  name         text not null,
  description  text not null default '',
  price        int  not null check (price >= 0), -- VND
  image_url    text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int  not null default 0
);

create table public.tables (
  id          uuid primary key default gen_random_uuid(),
  area_id     uuid references public.areas(id) on delete set null,
  name        text not null,
  seats       int  not null default 4 check (seats > 0),
  status      text not null default 'empty' check (status in ('empty','busy','reserved')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (area_id, name)
);

create sequence public.order_code_seq start 1;

create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default ('HD-' || lpad(nextval('public.order_code_seq')::text, 4, '0')),
  table_id     uuid references public.tables(id) on delete set null,
  table_label  text not null default '',
  status       text not null default 'open' check (status in ('open','paid','cancelled')),
  subtotal     int  not null default 0 check (subtotal >= 0),
  discount     int  not null default 0 check (discount >= 0),
  total        int  not null default 0 check (total >= 0),
  note         text not null default '',
  created_by   uuid references public.profiles(id) on delete set null,
  paid_by      uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  menu_item_id    uuid references public.menu_items(id) on delete set null,
  name_snapshot   text not null,
  unit_price      int  not null check (unit_price >= 0),
  qty             int  not null check (qty > 0 and qty <= 99),
  note            text not null default '',
  created_at      timestamptz not null default now()
);

create table public.audit_log (
  id          bigserial primary key,
  actor       uuid references public.profiles(id) on delete set null,
  actor_name  text not null default '',
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index idx_menu_items_category on public.menu_items(category_id);
create index idx_tables_area on public.tables(area_id);
create index idx_orders_status_table on public.orders(status, table_id);
create index idx_orders_paid_at on public.orders(paid_at desc);
create index idx_order_items_order on public.order_items(order_id);
create index idx_audit_created on public.audit_log(created_at desc);

-- ============================================================
-- 2. Helper functions
-- ============================================================
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.log_audit(
  p_action text, p_entity text, p_entity_id text, p_detail jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log(actor, actor_name, action, entity, entity_id, detail)
  values (
    auth.uid(),
    coalesce((select full_name from public.profiles where id = auth.uid()), 'Hệ thống'),
    p_action, p_entity, p_entity_id, coalesce(p_detail, '{}'::jsonb)
  );
end $$;

-- Tính lại tổng tiền của 1 order
create or replace function public.recalc_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_subtotal int;
begin
  select coalesce(sum(qty * unit_price), 0) into v_subtotal
  from public.order_items where order_id = p_order_id;

  update public.orders
  set subtotal = v_subtotal,
      total = greatest(v_subtotal - discount, 0),
      updated_at = now()
  where id = p_order_id;
end $$;

create or replace function public.recalc_order_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_order(coalesce(new.order_id, old.order_id));
  return null;
end $$;

create trigger trg_order_items_recalc
after insert or update or delete on public.order_items
for each row execute function public.recalc_order_trigger();

-- Audit tự động khi order đổi trạng thái
create or replace function public.audit_order_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit(
      'tạo đơn', 'order', new.id::text,
      jsonb_build_object('code', new.code, 'table', new.table_label)
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.log_audit(
      'đổi trạng thái đơn', 'order', new.id::text,
      jsonb_build_object('code', new.code, 'from', old.status, 'to', new.status, 'total', new.total)
    );
  end if;
  return null;
end $$;

create trigger trg_audit_orders
after insert or update on public.orders
for each row execute function public.audit_order_trigger();

-- ============================================================
-- 3. RPC — POS (staff + admin)
-- ============================================================
create or replace function public.pos_create_order(p_table_id uuid, p_note text default '')
returns public.orders language plpgsql security definer set search_path = public as $$
declare v_table public.tables; v_order public.orders;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;

  select * into v_table from public.tables where id = p_table_id and is_active;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  if v_table.status = 'busy' then raise exception 'TABLE_BUSY'; end if;
  if exists (select 1 from public.orders where table_id = p_table_id and status = 'open') then
    raise exception 'TABLE_BUSY';
  end if;

  insert into public.orders(table_id, table_label, note, created_by)
  values (p_table_id, v_table.name, coalesce(p_note, ''), auth.uid())
  returning * into v_order;

  update public.tables set status = 'busy' where id = p_table_id;
  return v_order;
end $$;

create or replace function public.pos_add_item(
  p_order_id uuid, p_menu_item_id uuid, p_qty int default 1, p_note text default ''
) returns public.order_items language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_item public.menu_items; v_row public.order_items;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 99 then raise exception 'INVALID_QTY'; end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'open' then raise exception 'ORDER_NOT_OPEN'; end if;

  select * into v_item from public.menu_items where id = p_menu_item_id;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;
  if not v_item.is_active then raise exception 'ITEM_UNAVAILABLE'; end if;

  insert into public.order_items(order_id, menu_item_id, name_snapshot, unit_price, qty, note)
  values (p_order_id, p_menu_item_id, v_item.name, v_item.price, p_qty, coalesce(p_note, ''))
  returning * into v_row;

  perform public.recalc_order(p_order_id);
  return v_row;
end $$;

create or replace function public.pos_update_item(p_item_id uuid, p_qty int)
returns void language plpgsql security definer set search_path = public as $$
declare v_item public.order_items; v_order public.orders;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_qty is null or p_qty < 0 or p_qty > 99 then raise exception 'INVALID_QTY'; end if;

  select * into v_item from public.order_items where id = p_item_id;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;

  select * into v_order from public.orders where id = v_item.order_id;
  if v_order.status <> 'open' then raise exception 'ORDER_NOT_OPEN'; end if;

  if p_qty = 0 then
    delete from public.order_items where id = p_item_id;
  else
    update public.order_items set qty = p_qty where id = p_item_id;
  end if;

  perform public.recalc_order(v_order.id);
end $$;

create or replace function public.pos_remove_item(p_item_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_item public.order_items; v_order public.orders;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into v_item from public.order_items where id = p_item_id;
  if not found then return; end if;
  select * into v_order from public.orders where id = v_item.order_id;
  if v_order.status <> 'open' then raise exception 'ORDER_NOT_OPEN'; end if;
  delete from public.order_items where id = p_item_id;
  perform public.recalc_order(v_order.id);
end $$;

create or replace function public.pos_move_order(p_order_id uuid, p_table_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_old_table uuid; v_new_table public.tables;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'open' then raise exception 'ORDER_NOT_OPEN'; end if;

  select * into v_new_table from public.tables where id = p_table_id and is_active;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  if v_new_table.id = v_order.table_id then return v_order; end if;
  if exists (select 1 from public.orders where table_id = p_table_id and status = 'open') then
    raise exception 'TABLE_BUSY';
  end if;

  v_old_table := v_order.table_id;

  update public.orders
  set table_id = p_table_id, table_label = v_new_table.name, updated_at = now()
  where id = p_order_id
  returning * into v_order;

  update public.tables set status = 'busy' where id = p_table_id;
  if v_old_table is not null
     and not exists (select 1 from public.orders where table_id = v_old_table and status = 'open') then
    update public.tables set status = 'empty' where id = v_old_table;
  end if;

  perform public.log_audit('chuyển bàn', 'order', p_order_id::text,
    jsonb_build_object('from', v_order.code, 'table', v_new_table.name));
  return v_order;
end $$;

create or replace function public.pos_merge_orders(p_source_id uuid, p_target_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare v_src public.orders; v_dst public.orders;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_source_id = p_target_id then raise exception 'SAME_ORDER'; end if;

  select * into v_src from public.orders where id = p_source_id for update;
  select * into v_dst from public.orders where id = p_target_id for update;
  if v_src.id is null or v_dst.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_src.status <> 'open' or v_dst.status <> 'open' then raise exception 'ORDER_NOT_OPEN'; end if;

  update public.order_items set order_id = p_target_id where order_id = p_source_id;
  update public.orders
  set status = 'cancelled', updated_at = now(), note = note || ' [gộp vào ' || v_dst.code || ']'
  where id = p_source_id;

  perform public.recalc_order(p_target_id);
  if v_src.table_id is not null
     and not exists (select 1 from public.orders where table_id = v_src.table_id and status = 'open') then
    update public.tables set status = 'empty' where id = v_src.table_id;
  end if;

  perform public.log_audit('gộp đơn', 'order', v_src.id::text,
    jsonb_build_object('source', v_src.code, 'target', v_dst.code));

  select * into v_dst from public.orders where id = p_target_id;
  return v_dst;
end $$;

create or replace function public.pos_pay_order(p_order_id uuid, p_discount int default 0)
returns public.orders language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_subtotal int;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_discount is null or p_discount < 0 then raise exception 'INVALID_DISCOUNT'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'open' then raise exception 'ORDER_NOT_OPEN'; end if;

  select coalesce(sum(qty * unit_price), 0) into v_subtotal
  from public.order_items where order_id = p_order_id;
  if v_subtotal <= 0 then raise exception 'EMPTY_ORDER'; end if;
  if p_discount > v_subtotal then raise exception 'INVALID_DISCOUNT'; end if;

  update public.orders
  set status = 'paid', discount = p_discount,
      subtotal = v_subtotal, total = v_subtotal - p_discount,
      paid_by = auth.uid(), paid_at = now(), updated_at = now()
  where id = p_order_id
  returning * into v_order;

  if v_order.table_id is not null
     and not exists (select 1 from public.orders where table_id = v_order.table_id and status = 'open') then
    update public.tables set status = 'empty' where id = v_order.table_id;
  end if;

  return v_order;
end $$;

create or replace function public.pos_cancel_order(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare v_order public.orders;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'open' then raise exception 'ORDER_NOT_OPEN'; end if;

  update public.orders set status = 'cancelled', updated_at = now()
  where id = p_order_id returning * into v_order;

  if v_order.table_id is not null
     and not exists (select 1 from public.orders where table_id = v_order.table_id and status = 'open') then
    update public.tables set status = 'empty' where id = v_order.table_id;
  end if;
  return v_order;
end $$;

create or replace function public.pos_set_table_status(p_table_id uuid, p_status text)
returns public.tables language plpgsql security definer set search_path = public as $$
declare v_table public.tables;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('empty','reserved') then raise exception 'INVALID_STATUS'; end if;
  if p_status = 'empty' and exists (
    select 1 from public.orders where table_id = p_table_id and status = 'open'
  ) then raise exception 'TABLE_HAS_OPEN_ORDER'; end if;

  update public.tables set status = p_status where id = p_table_id and is_active
  returning * into v_table;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  return v_table;
end $$;

create or replace function public.pos_set_item_note(p_item_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_item public.order_items; v_status text;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_note is null or length(p_note) > 200 then raise exception 'INVALID_NOTE'; end if;

  select * into v_item from public.order_items where id = p_item_id;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;

  select status into v_status from public.orders where id = v_item.order_id;
  if v_status <> 'open' then raise exception 'ORDER_NOT_OPEN'; end if;

  update public.order_items set note = trim(p_note) where id = p_item_id;
end $$;

-- ============================================================
-- 4. RPC — Admin
-- ============================================================
create or replace function public.admin_set_member(
  p_user_id uuid, p_role text, p_is_active boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('admin','staff') then raise exception 'INVALID_ROLE'; end if;
  if p_user_id = auth.uid() and (p_role <> 'admin' or p_is_active = false) then
    raise exception 'CANNOT_UPDATE_SELF';
  end if;

  update public.profiles
  set role = p_role, is_active = p_is_active
  where id = p_user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  perform public.log_audit('cập nhật nhân viên', 'profile', p_user_id::text,
    jsonb_build_object('role', p_role, 'is_active', p_is_active));
end $$;

-- ============================================================
-- 5. Profiles: tự tạo khi có user mới
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'staff')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- 6. RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.areas enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "categories_read" on public.categories
for select to authenticated using (public.is_staff());
create policy "categories_admin_write" on public.categories
for insert to authenticated with check (public.is_admin());
create policy "categories_admin_update" on public.categories
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories_admin_delete" on public.categories
for delete to authenticated using (public.is_admin());

create policy "menu_read" on public.menu_items
for select to authenticated using (public.is_staff());
create policy "menu_admin_write" on public.menu_items
for insert to authenticated with check (public.is_admin());
create policy "menu_admin_update" on public.menu_items
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "menu_admin_delete" on public.menu_items
for delete to authenticated using (public.is_admin());

create policy "areas_read" on public.areas
for select to authenticated using (public.is_staff());
create policy "areas_admin_write" on public.areas
for insert to authenticated with check (public.is_admin());
create policy "areas_admin_update" on public.areas
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "areas_admin_delete" on public.areas
for delete to authenticated using (public.is_admin());

create policy "tables_read" on public.tables
for select to authenticated using (public.is_staff());
create policy "tables_admin_write" on public.tables
for insert to authenticated with check (public.is_admin());
create policy "tables_admin_update" on public.tables
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "tables_admin_delete" on public.tables
for delete to authenticated using (public.is_admin());

-- orders / order_items: chỉ đọc trực tiếp, mọi thay đổi qua RPC
create policy "orders_read" on public.orders
for select to authenticated using (public.is_staff());
create policy "order_items_read" on public.order_items
for select to authenticated using (public.is_staff());

create policy "audit_admin_read" on public.audit_log
for select to authenticated using (public.is_admin());

-- ============================================================
-- 7. Grants & quyền gọi RPC
-- ============================================================
revoke all on public.profiles, public.categories, public.menu_items, public.areas,
  public.tables, public.orders, public.order_items, public.audit_log from anon;
grant select on public.profiles, public.categories, public.menu_items, public.areas,
  public.tables, public.orders, public.order_items, public.audit_log to authenticated;
grant insert, update, delete on public.categories, public.menu_items, public.areas,
  public.tables to authenticated;
grant usage on sequence public.order_code_seq to authenticated;

revoke execute on function public.current_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.log_audit(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.recalc_order(uuid) from public, anon;
revoke execute on function public.recalc_order_trigger() from public, anon;
revoke execute on function public.audit_order_trigger() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;

grant execute on function public.pos_create_order(uuid, text) to authenticated;
grant execute on function public.pos_add_item(uuid, uuid, int, text) to authenticated;
grant execute on function public.pos_update_item(uuid, int) to authenticated;
grant execute on function public.pos_remove_item(uuid) to authenticated;
grant execute on function public.pos_move_order(uuid, uuid) to authenticated;
grant execute on function public.pos_merge_orders(uuid, uuid) to authenticated;
grant execute on function public.pos_pay_order(uuid, int) to authenticated;
grant execute on function public.pos_cancel_order(uuid) to authenticated;
grant execute on function public.pos_set_table_status(uuid, text) to authenticated;
grant execute on function public.pos_set_item_note(uuid, text) to authenticated;
grant execute on function public.admin_set_member(uuid, text, boolean) to authenticated;

-- ============================================================
-- 8. Views báo cáo (RLS của bảng gốc vẫn áp dụng)
-- ============================================================
create view public.v_daily_revenue with (security_invoker = true) as
select
  (paid_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
  sum(total)::bigint as revenue,
  count(*)::int as order_count
from public.orders
where status = 'paid'
group by 1;

create view public.v_top_items with (security_invoker = true) as
select
  oi.menu_item_id,
  oi.name_snapshot as name,
  sum(oi.qty)::int as qty_sold,
  sum(oi.qty * oi.unit_price)::bigint as revenue
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.status = 'paid'
group by 1, 2;

grant select on public.v_daily_revenue, public.v_top_items to authenticated;

-- ============================================================
-- 9. Realtime
-- ============================================================
alter table public.tables replica identity full;
alter table public.orders replica identity full;
alter table public.order_items replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.tables;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.order_items;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================
-- 10. Storage bucket cho ảnh món
-- ============================================================
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;

drop policy if exists "menu_images_public_read" on storage.objects;
drop policy if exists "menu_images_admin_insert" on storage.objects;
drop policy if exists "menu_images_admin_update" on storage.objects;
drop policy if exists "menu_images_admin_delete" on storage.objects;

create policy "menu_images_public_read" on storage.objects
for select to public using (bucket_id = 'menu-images');
create policy "menu_images_admin_insert" on storage.objects
for insert to authenticated with check (bucket_id = 'menu-images' and public.is_admin());
create policy "menu_images_admin_update" on storage.objects
for update to authenticated using (bucket_id = 'menu-images' and public.is_admin());
create policy "menu_images_admin_delete" on storage.objects
for delete to authenticated using (bucket_id = 'menu-images' and public.is_admin());

-- ============================================================
-- 11. Seed dữ liệu mẫu
-- ============================================================
insert into public.categories (name, sort_order) values
  ('Cà phê', 1),
  ('Trà & trái cây', 2),
  ('Đá xay', 3),
  ('Bánh ngọt', 4);

insert into public.menu_items (category_id, name, description, price, sort_order)
select c.id, v.name, v.description, v.price, v.sort_order
from (values
  ('Cà phê', 'Cà phê đen', 'Cà phê phin truyền thống, đậm vị', 25000, 1),
  ('Cà phê', 'Cà phê sữa', 'Phin đen kết hợp sữa đặc', 29000, 2),
  ('Cà phê', 'Bạc xỉu', 'Nhiều sữa, ít cà phê', 32000, 3),
  ('Cà phê', 'Cold Brew', 'Ủ lạnh 18 giờ, thanh mát', 45000, 4),
  ('Trà & trái cây', 'Trà đào cam sả', 'Đào ngâm, cam tươi, sả', 39000, 1),
  ('Trà & trái cây', 'Trà xoài nhiệt đới', 'Xoài chín, trà lài', 42000, 2),
  ('Trà & trái cây', 'Trà sen vàng', 'Sen, củ sâm, táo đỏ', 45000, 3),
  ('Đá xay', 'Matcha đá xay', 'Matcha Nhật, sữa tươi', 49000, 1),
  ('Đá xay', 'Cookies đá xay', 'Bánh quy giòn, kem tươi', 52000, 2),
  ('Bánh ngọt', 'Croissant bơ', 'Nướng mỗi sáng', 35000, 1),
  ('Bánh ngọt', 'Tiramisu', 'Cà phê, mascarpone', 45000, 2)
) as v(cat, name, description, price, sort_order)
join public.categories c on c.name = v.cat;

insert into public.areas (name, sort_order) values
  ('Tầng 1', 1),
  ('Sân vườn', 2);

insert into public.tables (area_id, name, seats)
select a.id, v.name, v.seats
from (values
  ('Tầng 1', 'B01', 2), ('Tầng 1', 'B02', 2), ('Tầng 1', 'B03', 4),
  ('Tầng 1', 'B04', 4), ('Tầng 1', 'B05', 6),
  ('Sân vườn', 'S01', 4), ('Sân vườn', 'S02', 4), ('Sân vườn', 'S03', 8)
) as v(area, name, seats)
join public.areas a on a.name = v.area;
