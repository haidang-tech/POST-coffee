import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "POST Coffee · Quản lý quán",
    template: "%s · POST Coffee",
  },
  description: "Hệ thống quản lý bán hàng cho quán POST Coffee.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fdfaf5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${display.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
