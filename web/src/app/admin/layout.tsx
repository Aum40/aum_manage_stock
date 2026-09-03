import type { Metadata } from "next";

import AdminShell from "@/components/layout/AdminShell";

export const metadata: Metadata = {
  title: "Admin Overview | AumStocks",
  description: "ภาพรวมการดูแลระบบ AumStocks",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
