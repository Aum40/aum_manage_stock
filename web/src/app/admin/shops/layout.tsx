import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จัดการร้านค้า | AumStocks",
  description: "จัดการร้านค้าและสถานะการใช้งาน",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

