import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สินค้าและสต็อก | AumStocks",
  description: "จัดการสินค้า ราคาขาย และจำนวนสต็อก",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

