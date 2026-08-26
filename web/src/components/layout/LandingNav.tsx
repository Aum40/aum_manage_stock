"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChartNoAxesColumnIncreasing, History, Package, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LogoutButton from "@/components/layout/LogoutButton";
import LanguageToggle from "@/components/layout/LanguageToggle";
import { useLocale } from "@/components/i18n/LocaleContext";
import type { CurrentUser } from "@/lib/types/user";
import { cn } from "@/lib/utils";

const labels = {
  th: { dashboard: "แดชบอร์ด", products: "สินค้า", stock: "สต็อก", shops: "ร้านค้า", profile: "แก้ไขโปรไฟล์", logout: "ออกจากระบบ", features: "ฟีเจอร์", pricing: "ราคา", login: "เข้าสู่ระบบ", register: "สมัครสมาชิก" },
  en: { dashboard: "Dashboard", products: "Products", stock: "Stock", shops: "Shops", profile: "Edit profile", logout: "Log out", features: "Features", pricing: "Pricing", login: "Log in", register: "Sign up" },
};

export default function LandingNav() {
  const { locale } = useLocale();
  const t = labels[locale];
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    fetch("/api/users/me", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<CurrentUser> : null)
      .then((currentUser) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setResolved(true));
  }, []);

  const userInitial = (user?.firstName || user?.username || "A").charAt(0).toUpperCase();

  return <div className="sticky top-0 z-40 flex justify-center px-6 py-4"><nav className={cn("flex w-full max-w-5xl items-center gap-4 rounded-full bg-background px-5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.10)] sm:px-7", locale === "th" ? "font-nav-th" : "font-nav")}><Link href="/" aria-label="AumStocks" className="font-logo shrink-0 text-lg font-bold tracking-[-0.01em]"><span className="text-foreground">Aum</span><span className="text-primary">Stocks</span></Link>
    {!resolved ? <div className="ml-auto h-8 w-20" /> : user ? <><div className="mr-auto hidden items-center gap-1 md:flex"><Link href="/dashboard" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><ChartNoAxesColumnIncreasing className="size-4" />{t.dashboard}</Link><Link href="/products" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Package className="size-4" />{t.products}</Link><Link href="/stock-history" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><History className="size-4" />{t.stock}</Link><Link href="/shops" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Store className="size-4" />{t.shops}</Link></div><div className="flex items-center gap-2"><Link href="/profile" aria-label={t.profile} title={t.profile} className="rounded-full outline-none ring-offset-2 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary"><Avatar size="sm"><AvatarFallback className="bg-primary font-heading font-bold text-primary-foreground">{userInitial}</AvatarFallback></Avatar></Link><LogoutButton label={t.logout} /></div><LanguageToggle onDark={false} /></> : <div className="ml-auto flex items-center gap-2.5"><a href="#features" className="hidden self-center text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:inline">{t.features}</a><a href="#pricing" className="hidden self-center text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:inline">{t.pricing}</a><Button variant="outline" size="sm" render={<Link href="/login" />}>{t.login}</Button><Button variant="gradient" size="sm" render={<Link href="/register" />}>{t.register}</Button><LanguageToggle onDark={false} /></div>}
  </nav></div>;
}
