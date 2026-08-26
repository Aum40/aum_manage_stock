import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สมัครสมาชิก | AumStocks",
  description: "สร้างบัญชี AumStocks สำหรับจัดการร้านค้า",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

