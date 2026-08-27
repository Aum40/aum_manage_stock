import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | AumStocks",
  description: "เข้าสู่ระบบเพื่อจัดการร้านค้าและสต็อกสินค้า",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

