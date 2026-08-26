import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จัดการ Admin | AumStocks",
  description: "จัดการบัญชีผู้ดูแลระบบ",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

