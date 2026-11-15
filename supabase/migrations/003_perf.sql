-- Migration 003: tối ưu hiệu năng
-- 1. Index cho truy vấn nóng (bàn đang mở, đơn theo ngày, thực đơn đang bán)
-- 2. Gộp dòng món trùng (cùng món + cùng ghi chú) để giảm số row mỗi đơn
-- 3. RPC báo cáo top món có lọc thời gian (thay vì quét toàn bộ lịch sử)

create index if not exists idx_orders_status_created
  on public.orders (status, created_at desc);

create index if not exists idx_orders_created_at
  on public.orders (created_at desc);

create index if not exists idx_orders_paid_only
  on public.orders (paid_at) where status = 'paid';

create index if not exists idx_orders_open_table
  on public.orders (table_id) where status = 'open';

create index if not exists idx_menu_items_active_sort
  on public.menu_items (is_active, sort_order);

-- Gộp món trùng thay vì tạo thêm dòng
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

  -- Cùng món + cùng ghi chú => cộng dồn số lượng
  update public.order_items
  set qty = qty + p_qty
  where order_id = p_order_id
    and menu_item_id = p_menu_item_id
    and note = coalesce(p_note, '')
    and qty + p_qty <= 99
  returning * into v_row;

  if not found then
    insert into public.order_items(order_id, menu_item_id, name_snapshot, unit_price, qty, note)
    values (p_order_id, p_menu_item_id, v_item.name, v_item.price, p_qty, coalesce(p_note, ''))
    returning * into v_row;
  end if;

  perform public.recalc_order(p_order_id);
  return v_row;
end $$;

revoke execute on function public.pos_add_item(uuid, uuid, int, text) from public, anon;
grant execute on function public.pos_add_item(uuid, uuid, int, text) to authenticated;

-- Báo cáo top món trong N ngày (dùng index paid_at, không quét toàn bảng)
drop view if exists public.v_top_items cascade;

create or replace function public.admin_top_items(p_days int default 30, p_limit int default 5)
returns table (name text, qty_sold int, revenue bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  return query
    select oi.name_snapshot,
           sum(oi.qty)::int,
           sum(oi.qty * oi.unit_price)::bigint
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status = 'paid'
      and o.paid_at >= now() - make_interval(days => greatest(p_days, 1))
    group by oi.name_snapshot
    order by 2 desc
    limit greatest(p_limit, 1);
end $$;

revoke execute on function public.admin_top_items(int, int) from public, anon;
grant execute on function public.admin_top_items(int, int) to authenticated;
