import type { OrderItem } from "./types";

export type OrderPreviewChange =
  | { type: "add"; item: OrderItem }
  | { type: "quantity"; id: string; qty: number };

// Preview only: server actions remain authoritative for prices and payment.
export function previewOrder(items: OrderItem[], change: OrderPreviewChange): OrderItem[] {
  if (change.type === "quantity") {
    return items.map((item) => item.id === change.id ? { ...item, qty: change.qty } : item)
      .filter((item) => item.qty > 0);
  }
  const existing = items.find((item) => item.menu_item_id === change.item.menu_item_id && item.note === "");
  if (!existing) return [...items, change.item];
  return items.map((item) => item.id === existing.id ? { ...item, qty: item.qty + 1 } : item);
}

export function searchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
}
