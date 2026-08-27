"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleContext";
import { getAuthCopy } from "@/components/features/auth/auth-copy";

const tabs = [
  { href: "/login", label: "เข้าสู่ระบบ" },
  { href: "/register", label: "สมัครสมาชิก" },
  { href: "/forgot-password", label: "ลืมรหัสผ่าน" },
] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const copy = getAuthCopy(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream p-4 sm:p-6">
      <div className="w-full max-w-115 rounded-3xl bg-background p-6 shadow-[0_8px_40px_rgba(0,0,0,0.10)] sm:p-10">
        <Link href="/" aria-label="AumStocks" className="mb-1.5 block text-center font-logo text-2xl font-bold tracking-[-0.01em]">
          <span className="text-foreground">Aum</span>
          <span className="text-primary">Stocks</span>
        </Link>
        <div className="mb-6 text-center text-[13px] text-muted-foreground">{copy.brandTagline}</div>

        <div className="mb-7 flex gap-0.5 rounded-full bg-secondary p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 rounded-full px-2.5 py-2 text-center text-[13px] whitespace-nowrap transition-all ${
                tab.href === pathname
                  ? "bg-background font-bold text-foreground shadow-[0_1px_6px_rgba(0,0,0,0.10)]"
                  : "font-normal text-muted-foreground"
              }`}
            >
              {copy.tabs[tab.href === "/login" ? "login" : tab.href === "/register" ? "register" : "forgot"]}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
