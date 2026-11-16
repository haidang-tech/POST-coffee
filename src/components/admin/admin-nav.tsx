"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Armchair,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/mon", label: "Thực đơn", icon: UtensilsCrossed },
  { href: "/admin/ban", label: "Bàn & khu vực", icon: Armchair },
  { href: "/admin/don-hang", label: "Đơn hàng", icon: ReceiptText },
  { href: "/admin/nhan-vien", label: "Nhân viên", icon: Users },
  { href: "/admin/nhat-ky", label: "Nhật ký", icon: ScrollText },
];

export function AdminNav({ variant = "sidebar" }: { variant?: "sidebar" | "bar" }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        variant === "sidebar"
          ? "mt-6 flex flex-col gap-1"
          : "no-scrollbar flex gap-1 overflow-x-auto",
      )}
    >
      {ITEMS.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              variant === "bar" && "shrink-0 py-2",
              active
                ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                : "text-coffee-700 hover:bg-cream-100",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
