import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ร้านค้าของฉัน | AumStocks",
  description: "จัดการร้านค้าและสาขา",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

