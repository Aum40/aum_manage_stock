import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เพิ่มสินค้าเข้าร้าน | AumStocks",
  description: "เลือกสินค้าและตั้งราคาสำหรับร้านค้า",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

