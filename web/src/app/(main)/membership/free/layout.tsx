import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สมาชิกและการชำระเงิน | AumStocks",
  description: "ดูแพ็กเกจ สมาชิก และประวัติการชำระเงิน",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

