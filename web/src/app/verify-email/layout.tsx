import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ยืนยันอีเมล | AumStocks",
  description: "ยืนยันอีเมลสำหรับบัญชี AumStocks",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

