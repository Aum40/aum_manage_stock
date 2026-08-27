import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เพิ่มสินค้า | AumStocks",
  description: "เพิ่มสินค้าใหม่ในแคตตาล็อก",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

