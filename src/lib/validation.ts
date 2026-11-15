import { z } from "zod";

const uuid = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ")),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72),
});

export const categorySchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Nhập tên nhóm").max(40),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const menuItemSchema = z.object({
  id: uuid.optional(),
  category_id: uuid.nullable(),
  name: z.string().trim().min(1, "Nhập tên món").max(80),
  description: z.string().trim().max(300).default(""),
  price: z.number().int("Giá phải là số nguyên").min(0).max(10_000_000),
  image_url: z.string().trim().max(500).nullable().default(null),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const areaSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Nhập tên khu vực").max(40),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const tableSchema = z.object({
  id: uuid.optional(),
  area_id: uuid.nullable(),
  name: z.string().trim().min(1, "Nhập tên bàn").max(20),
  seats: z.number().int().min(1).max(50).default(4),
  is_active: z.boolean().default(true),
});

export const memberSchema = z.object({
  user_id: uuid,
  role: z.enum(["admin", "staff"]),
  is_active: z.boolean(),
});

export const createStaffSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ")),
  full_name: z.string().trim().min(1, "Nhập họ tên").max(60),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72),
});

export const orderNoteSchema = z.object({
  order_id: uuid,
  note: z.string().trim().max(200).default(""),
});
