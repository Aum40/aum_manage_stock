import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "พนักงานและสิทธิ์ | AumStocks",
  description: "จัดการพนักงานและสิทธิ์การเข้าถึง",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

