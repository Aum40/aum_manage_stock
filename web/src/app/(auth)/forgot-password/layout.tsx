import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "รีเซ็ตรหัสผ่าน | AumStocks",
  description: "กู้คืนรหัสผ่านบัญชี AumStocks",
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

