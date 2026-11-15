-- Nước ép: giá 25.000đ theo menu của quán.
begin;
insert into public.categories (name, sort_order)
select 'Nước ép', 5 where not exists (select 1 from public.categories where name = 'Nước ép');

insert into public.menu_items (category_id, name, description, price, sort_order, image_url)
select c.id, v.name, v.description, 25000, v.sort_order, v.image_url
from (values
  ('Nước ép táo', 'Táo ép tươi, thanh ngọt', 1, 'https://culgwwmnynljyzqwwxgg.supabase.co/storage/v1/object/public/menu-images/menu/nuoc-ep-tao.webp'),
  ('Nước ép thơm', 'Thơm ép tươi, chua ngọt', 2, 'https://culgwwmnynljyzqwwxgg.supabase.co/storage/v1/object/public/menu-images/menu/nuoc-ep-thom.webp'),
  ('Nước ép cà rốt', 'Cà rốt ép tươi', 3, 'https://culgwwmnynljyzqwwxgg.supabase.co/storage/v1/object/public/menu-images/menu/nuoc-ep-ca-rot.webp'),
  ('Nước ép ổi', 'Ổi ép tươi, thơm dịu', 4, 'https://culgwwmnynljyzqwwxgg.supabase.co/storage/v1/object/public/menu-images/menu/nuoc-ep-oi.webp')
) as v(name, description, sort_order, image_url)
join public.categories c on c.name = 'Nước ép'
where not exists (select 1 from public.menu_items m where m.name = v.name);
commit;
