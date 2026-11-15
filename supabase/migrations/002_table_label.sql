-- Migration: đồng bộ nhãn bàn trên các đơn đang mở khi admin đổi tên bàn
create or replace function public.admin_sync_table_label(p_table_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  select name into v_name from public.tables where id = p_table_id;
  if v_name is null then return; end if;

  update public.orders
  set table_label = v_name
  where table_id = p_table_id and status = 'open';
end $$;

revoke execute on function public.admin_sync_table_label(uuid) from public, anon;
grant execute on function public.admin_sync_table_label(uuid) to authenticated;
