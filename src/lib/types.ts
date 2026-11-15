export type Role = "admin" | "staff";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Area = {
  id: string;
  name: string;
  sort_order: number;
};

export type TableStatus = "empty" | "busy" | "reserved";

export type CoffeeTable = {
  id: string;
  area_id: string | null;
  name: string;
  seats: number;
  status: TableStatus;
  is_active: boolean;
};

export type OrderStatus = "open" | "paid" | "cancelled";

export type Order = {
  id: string;
  code: string;
  table_id: string | null;
  table_label: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  note: string;
  created_by: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  unit_price: number;
  qty: number;
  note: string;
  created_at: string;
};

export type AuditEntry = {
  id: number;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};
