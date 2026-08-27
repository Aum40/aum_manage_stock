import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "คำแนะนำจาก AI | AumStocks",
  description: "ให้ AI ดูสต็อกและยอดขายจริง แล้วบอกว่าควรเติมหรือระบายตัวไหน",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
