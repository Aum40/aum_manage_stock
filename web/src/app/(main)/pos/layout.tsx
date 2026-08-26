import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ขายหน้าร้าน | AumStocks",
  description: "สแกนสินค้าและบันทึกการขาย",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

