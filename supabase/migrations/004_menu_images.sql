-- Thêm 2 món cà phê còn thiếu + gắn ảnh minh họa cho 4 dòng cà phê
insert into public.menu_items (category_id, name, description, price, sort_order)
select c.id, v.name, v.description, v.price, v.sort_order
from (values
  ('Cà phê', 'Cà phê Espresso', 'Espresso đậm đặc, lớp crema mịn', 30000, 5),
  ('Cà phê', 'Cà phê muối', 'Cà phê đậm, kem muối mặn ngọt', 35000, 6)
) as v(cat, name, description, price, sort_order)
join public.categories c on c.name = v.cat
where not exists (select 1 from public.menu_items m where m.name = v.name);

update public.menu_items m
set image_url = v.url
from (values
  ('Cà phê Espresso', 'https://culgwwmnynljyzqwwxgg.supabase.co/storage/v1/object/public/menu-images/menu/espresso.png'),
  ('Cà phê sữa',      'https://culgwwmnynljyzqwwxgg.supabase.co/storage/v1/object/public/menu-images/menu/ca-phe-sua.png'),
  ('Cà phê đen',      'https://culgwwmnynljyzqwwxgg.supabase.co/storage/v1/object/public/menu-images/menu/ca-phe-den.png'),
  ('Cà phê muối',     'https://culgwwmnynljyzqwwxgg.supabase.co/storage/v1/object/public/menu-images/menu/ca-phe-muoi.png')
) as v(name, url)
where m.name = v.name;

select name, price, sort_order, image_url is not null as has_image
from public.menu_items
order by sort_order;
