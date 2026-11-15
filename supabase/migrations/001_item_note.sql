-- Migration: ghi chú cho từng món trong đơn
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

revoke execute on function public.pos_set_item_note(uuid, text) from public, anon;
grant execute on function public.pos_set_item_note(uuid, text) to authenticated;
