"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useSelectedShop } from "@/components/shared/SelectedShopContext";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type Notification,
} from "@/lib/hooks/use-inventory";

/**
 * กระดิ่งเดิมกดแล้ว mark-all-read อย่างเดียว ไม่เคยแสดงว่าเกิดอะไรขึ้น
 * (มี TODO เขียนค้างไว้ใน TopBar) — แปลว่าการกดดูคือการ **ทำลาย** ข้อความ
 * ที่ยังไม่ได้อ่านโดยไม่มีทางกู้ ซึ่งแย่กว่าไม่มีปุ่มเลย
 *
 * ใช้ Dialog แทนแผงลอยใต้กระดิ่ง เพราะชุด UI ยังไม่มี Popover และร้านค้า
 * ส่วนใหญ่เปิดจากมือถือ แผงลอยบนจอเล็กจะแคบจนอ่านไม่ออก
 *
 * แสดงทั้งที่อ่านแล้วและยังไม่อ่าน ไม่ใช่เฉพาะที่ค้าง — เจ้าของร้านที่เพิ่งกดปิด
 * ไปต้องย้อนกลับมาดูได้ว่าเมื่อเช้ามีอะไรแจ้งมาบ้าง
 *
 * ⚠️ ต้องอยู่ใต้ SelectedShopProvider เท่านั้น (ประกาศใน (main)/layout.tsx)
 * เพราะเรียก useSelectedShop() ตั้งแต่ตอน render — หน้า admin อยู่นอก provider
 * นั้น TopBar จึงเรนเดอร์กล่องนี้เฉพาะเมื่อ notifications = true
 */

const content = {
  th: {
    title: "การแจ้งเตือน",
    description: "รายการล่าสุด — กดที่รายการเพื่อไปยังหน้าที่เกี่ยวข้อง",
    empty: "ยังไม่มีการแจ้งเตือน",
    loading: "กำลังโหลด…",
    markAll: "ทำเครื่องหมายว่าอ่านแล้วทั้งหมด",
    close: "ปิด",
    unread: "ใหม่",
    justNow: "เมื่อสักครู่",
    minutesAgo: (n: number) => `${n} นาทีที่แล้ว`,
    hoursAgo: (n: number) => `${n} ชั่วโมงที่แล้ว`,
    daysAgo: (n: number) => `${n} วันที่แล้ว`,
  },
  en: {
    title: "Notifications",
    description: "Latest first — tap one to open the page it refers to",
    empty: "Nothing here yet",
    loading: "Loading…",
    markAll: "Mark everything as read",
    close: "Close",
    unread: "New",
    justNow: "just now",
    minutesAgo: (n: number) => `${n} min ago`,
    hoursAgo: (n: number) => `${n} h ago`,
    daysAgo: (n: number) => `${n} d ago`,
  },
};

/**
 * แจ้งเตือนที่กดแล้วไม่พาไปไหนก็เป็นแค่ข้อความ — ผูกปลายทางตามชนิด
 * ชนิดที่ไม่รู้จักให้ไม่ต้องเป็นลิงก์ ดีกว่าเดามั่วแล้วพาไปผิดหน้า
 */
const HREF_BY_TYPE: Record<string, string> = {
  LOW_STOCK: "/products",
  PRODUCT_LIMIT_REACHED: "/membership",
  SHOP_LIMIT_REACHED: "/membership",
  SUBSCRIPTION_EXPIRING: "/membership",
  SUBSCRIPTION_EXPIRED: "/membership",
};

function relativeTime(iso: string, t: (typeof content)["th"]): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo(minutes);
  if (minutes < 60 * 24) return t.hoursAgo(Math.floor(minutes / 60));
  return t.daysAgo(Math.floor(minutes / (60 * 24)));
}

export function NotificationsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const t = content[locale];
  const { setSelectedShopId } = useSelectedShop();

  // เปิดกล่องค่อยยิง ไม่ต้องโหลดรายการเต็มไว้ตลอดเวลาเพื่อโชว์แค่ตัวเลขบนกระดิ่ง
  const notificationsQuery = useNotifications(false, open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = notificationsQuery.data?.items ?? [];
  const unreadCount = items.filter((item) => item.readAt === null).length;

  const openItem = (item: Notification) => {
    if (item.readAt === null) markRead.mutate(item.id);
    // พาไปหน้าที่เกี่ยวข้องแล้วต้องสลับร้านให้ตรงด้วย ไม่งั้นเปิดไปเจอร้านอื่น
    // แล้วหาสินค้าที่ถูกแจ้งไม่เจอ
    if (item.shopId) setSelectedShopId(item.shopId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {notificationsQuery.isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.loading}
            </p>
          )}

          {!notificationsQuery.isLoading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.empty}
            </p>
          )}

          <ul className="flex flex-col">
            {items.map((item) => {
              const href = HREF_BY_TYPE[item.type];
              const body = (
                <>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{item.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relativeTime(item.createdAt, t)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {item.message}
                  </span>
                  {item.readAt === null && (
                    <Badge variant="warning" className="mt-1.5">
                      {t.unread}
                    </Badge>
                  )}
                </>
              );

              return (
                <li
                  key={item.id}
                  className={`border-b border-border last:border-0 ${
                    item.readAt === null ? "bg-primary/5" : ""
                  }`}
                >
                  {href ? (
                    <Link
                      href={href}
                      onClick={() => openItem(item)}
                      className="block px-1 py-3 transition-colors hover:bg-muted/60"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="px-1 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t.close}
          </Button>
          <Button
            variant="gradient"
            size="sm"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {t.markAll}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
