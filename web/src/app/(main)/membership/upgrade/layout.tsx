import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "อัปเกรดแพ็กเกจ | AumStocks",
  description: "เลือกแพ็กเกจสำหรับร้านค้าของคุณ",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

