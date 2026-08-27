import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "รับสินค้าเข้า | AumStocks",
  description: "ยิงบาร์โค้ดเพื่อนับของเข้าคลัง",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
