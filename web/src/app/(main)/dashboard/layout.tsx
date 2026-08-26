import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แดชบอร์ด | AumStocks",
  description: "ภาพรวมยอดขายและสต็อกของร้าน",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

