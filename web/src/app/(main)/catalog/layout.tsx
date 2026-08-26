import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แคตตาล็อกสินค้า | AumStocks",
  description: "จัดการแคตตาล็อกสินค้ากลาง",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

