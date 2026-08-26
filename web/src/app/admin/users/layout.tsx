import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จัดการผู้ใช้ | AumStocks",
  description: "จัดการบัญชีผู้ใช้ในระบบ",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

