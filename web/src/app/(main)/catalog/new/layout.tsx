import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เพิ่มสินค้าในแคตตาล็อก | AumStocks",
  description: "สร้างสินค้าใหม่ในแคตตาล็อกกลาง",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

