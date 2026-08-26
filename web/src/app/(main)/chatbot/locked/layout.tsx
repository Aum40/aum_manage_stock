import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แชทบอทสต็อก | AumStocks",
  description: "ปรับสต็อกด้วยคำสั่งแชท",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

