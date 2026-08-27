import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "โปรไฟล์ | AumStocks",
  description: "จัดการข้อมูลโปรไฟล์และบัญชี",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

