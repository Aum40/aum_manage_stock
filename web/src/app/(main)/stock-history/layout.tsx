import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ประวัติสต็อก | AumStocks",
  description: "ตรวจสอบประวัติการเคลื่อนไหวสต็อก",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

