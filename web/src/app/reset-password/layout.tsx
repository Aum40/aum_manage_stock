import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ตั้งรหัสผ่านใหม่ | AumStocks",
  description: "ตั้งรหัสผ่านใหม่สำหรับบัญชี AumStocks",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

