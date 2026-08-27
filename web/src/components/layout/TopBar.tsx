"use client";

import { Bell, Menu } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMobileNav } from "@/components/layout/MobileNavContext";
import { useMarkAllNotificationsRead, useNotifications } from "@/lib/hooks/use-inventory";
import { useMe } from "@/lib/hooks/use-profile";
import { useLocale } from "@/components/i18n/LocaleContext";
import LogoutButton from "@/components/layout/LogoutButton";

interface TopBarProps {
  title: string;
  readOnly?: boolean;
  /** ปิดในหน้า admin — บัญชี admin ไม่มีร้าน จึงอ่าน /notifications ไม่ได้ */
  notifications?: boolean;
}

export default function TopBar({ title, readOnly, notifications = true }: TopBarProps) {
  const { toggle } = useMobileNav();
  const { locale } = useLocale();
  const meQuery = useMe();
  const notificationsQuery = useNotifications(true, notifications);
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notificationsQuery.data?.items.length ?? 0;
  const currentUser = meQuery.data;
  const roleLabel = currentUser
    ? locale === "th"
      ? ({ SHOP_OWNER: "เจ้าของร้าน", SHOP_STAFF: "พนักงาน", ADMIN: "ผู้ดูแลระบบ", SUPER_ADMIN: "ผู้ดูแลระบบสูงสุด" } as const)[currentUser.role]
      : ({ SHOP_OWNER: "Shop owner", SHOP_STAFF: "Staff", ADMIN: "Admin", SUPER_ADMIN: "Super admin" } as const)[currentUser.role]
    : "";
  const displayName = currentUser
    ? `${currentUser.firstName || currentUser.username || "—"}${roleLabel ? ` (${roleLabel})` : ""}`
    : "—";
  const displayInitial = (currentUser?.firstName || currentUser?.username || "—").charAt(0).toUpperCase();


  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 lg:h-21 lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label="Open menu"
          className="text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate font-heading text-lg font-bold text-foreground lg:text-xl">
          {title}
        </h1>
        {readOnly && <Badge variant="error">อ่านอย่างเดียว</Badge>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          title={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
          // TODO: ควรเปิดรายการแจ้งเตือน ตอนนี้ทำได้แค่ mark-all-read
          // ปิดปุ่มเมื่อไม่มีของค้าง จะได้ไม่ยิง mutation เปล่าๆ
          disabled={!notifications || unreadCount === 0}
          onClick={() => markAllRead.mutate()}
          className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {displayName}
        </span>
        <Link href="/profile" aria-label={locale === "th" ? "โปรไฟล์ของฉัน" : "My profile"}>
          <Avatar>
          {/* ใช้สีจาก token แทนสีที่ hardcode มากับข้อมูลผู้ใช้ปลอมชุดเดิม */}
          <AvatarFallback className="bg-primary font-heading font-bold text-primary-foreground">
            {displayInitial}
          </AvatarFallback>
          </Avatar>
        </Link>
        <LogoutButton label={locale === "th" ? "ออกจากระบบ" : "Log out"} iconOnly />
      </div>
    </header>
  );
}
