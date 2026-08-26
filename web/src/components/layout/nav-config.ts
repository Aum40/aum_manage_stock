// Pure data — no component references (icons included) here. This file gets
// imported by server-rendered layouts, and passing a component reference
// (e.g. a lucide icon) as a prop from a Server Component into the Client
// Component Sidebar/NavItem is not allowed (functions aren't serializable
// across that boundary). Icons are looked up by name inside NavItem.tsx,
// which is itself a Client Component.
export type IconKey =
  | "dashboard"
  | "package"
  | "cart"
  | "message"
  | "users"
  | "history"
  | "catalog"
  | "store"
  | "card"
  | "user"
  | "userCog"
  | "building";

export interface LocalizedLabel {
  th: string;
  en: string;
}

export interface NavItem {
  label: LocalizedLabel;
  href: string;
  icon: IconKey;
  locked?: "PLUS" | "PRO";
}

export interface NavSection {
  label: LocalizedLabel;
  items: NavItem[];
}

// TODO: replace this hardcoded role switch with the real session/plan data
// once auth-resource + subscriptions-resource are wired up. This is the only
// place that should need to change — Sidebar itself has no role knowledge.
export type SidebarRole =
  | "owner"
  | "free"
  | "expired"
  | "staff"
  | "admin"
  | "superadmin";

export function getNavSections(role: SidebarRole): NavSection[] {
  const dashboardHref = role === "expired" ? "/dashboard/expired" : "/dashboard";
  const isFree = role === "free";

  if (role === "admin" || role === "superadmin") {
    const sections: NavSection[] = [
      {
        label: { th: "ระบบ", en: "System" },
        items: [
          { label: { th: "ภาพรวมระบบ", en: "Overview" }, href: "/admin", icon: "dashboard" },
          { label: { th: "ผู้ใช้ทั้งหมด", en: "All Users" }, href: "/admin/users", icon: "users" },
          { label: { th: "ร้านค้าทั้งหมด", en: "All Shops" }, href: "/admin/shops", icon: "building" },
        ],
      },
    ];
    if (role === "superadmin") {
      sections.push({
        label: { th: "SUPER ADMIN", en: "SUPER ADMIN" },
        items: [
          {
            label: { th: "จัดการ Admin", en: "Manage Admins" },
            href: "/admin/manage",
            icon: "userCog",
          },
        ],
      });
    }
    return sections;
  }

  if (role === "staff") {
    return [
      {
        label: { th: "เมนูหลัก", en: "Main Menu" },
        items: [
          { label: { th: "แดชบอร์ด", en: "Dashboard" }, href: dashboardHref, icon: "dashboard" },
          { label: { th: "สินค้าและสต็อก", en: "Products & Stock" }, href: "/products", icon: "package" },
          { label: { th: "ขายหน้าร้าน (POS)", en: "Point of Sale" }, href: "/pos", icon: "cart" },
          { label: { th: "แชทบอทรับสต็อก", en: "Stock Chatbot" }, href: "/chatbot", icon: "message" },
        ],
      },
      {
        label: { th: "บัญชีของฉัน", en: "My Account" },
        items: [
          { label: { th: "ประวัติสต็อก", en: "Stock History" }, href: "/stock-history", icon: "history" },
          { label: { th: "โปรไฟล์ของฉัน", en: "My Profile" }, href: "/profile", icon: "user" },
        ],
      },
    ];
  }

  // owner / free / expired share the same shape, differing only in which
  // items are locked and which membership route they link to.
  return [
    {
      label: { th: "เมนูหลัก", en: "Main Menu" },
      items: [
        { label: { th: "แดชบอร์ด", en: "Dashboard" }, href: dashboardHref, icon: "dashboard" },
        { label: { th: "สินค้าและสต็อก", en: "Products & Stock" }, href: "/products", icon: "package" },
        {
          label: { th: "ขายหน้าร้าน (POS)", en: "Point of Sale" },
          href: "/pos",
          icon: "cart",
          locked: isFree ? "PLUS" : undefined,
        },
        {
          label: { th: "แชทบอทรับสต็อก", en: "Stock Chatbot" },
          href: isFree ? "/chatbot/locked" : "/chatbot",
          icon: "message",
          locked: isFree ? "PLUS" : undefined,
        },
        {
          label: { th: "พนักงานและสิทธิ์", en: "Staff & Permissions" },
          // [อั้ม] เดิมชี้ /staff/full ซึ่งเป็นหน้าสถานะ "โควตาเต็ม" ไม่ใช่หน้าหลัก
          // เมนูอื่นทุกอันชี้หน้าหลักทั้งหมด (/products ไม่ใช่ /products/limit)
          // ส่วนหน้าสถานะเลือกตอน runtime แบบ dashboardHref ด้านบน
          href: "/staff",
          icon: "users",
          locked: isFree ? "PLUS" : undefined,
        },
      ],
    },
    {
      label: { th: "การจัดการ", en: "Management" },
      items: [
        { label: { th: "ประวัติสต็อก", en: "Stock History" }, href: "/stock-history", icon: "history" },
        { label: { th: "แคตตาล็อกสินค้ากลาง", en: "Product Catalog" }, href: "/catalog", icon: "catalog" },
        { label: { th: "ร้านค้าของฉัน", en: "My Shops" }, href: "/shops", icon: "store" },
        {
          label: { th: "สมาชิกและการชำระเงิน", en: "Membership & Billing" },
          href: "/membership",
          icon: "card",
        },
        { label: { th: "โปรไฟล์ของฉัน", en: "My Profile" }, href: "/profile", icon: "user" },
      ],
    },
  ];
}

export const roleAvatar: Record<
  SidebarRole,
  {
    th: { name: string; initial: string; avatarColor: string };
    en: { name: string; initial: string; avatarColor: string };
  }
> = {
  owner: {
    th: { name: "คุณอุ้ม (เจ้าของร้าน)", initial: "อ", avatarColor: "#F5A31C" },
    en: { name: "Khun Aum (Shop Owner)", initial: "A", avatarColor: "#F5A31C" },
  },
  free: {
    th: { name: "คุณอุ้ม (เจ้าของร้าน)", initial: "อ", avatarColor: "#F5A31C" },
    en: { name: "Khun Aum (Shop Owner)", initial: "A", avatarColor: "#F5A31C" },
  },
  expired: {
    th: { name: "คุณอุ้ม (เจ้าของร้าน)", initial: "อ", avatarColor: "#F5A31C" },
    en: { name: "Khun Aum (Shop Owner)", initial: "A", avatarColor: "#F5A31C" },
  },
  staff: {
    th: { name: "คำหวาน เก่งดี (พนักงาน)", initial: "ค", avatarColor: "#5C9A54" },
    en: { name: "Numwan Kengdee (Staff)", initial: "N", avatarColor: "#5C9A54" },
  },
  admin: {
    th: { name: "วิภา ตั้งเจน (Admin)", initial: "ว", avatarColor: "#2B2A30" },
    en: { name: "Wipa Tangjen (Admin)", initial: "W", avatarColor: "#2B2A30" },
  },
  superadmin: {
    th: { name: "สมชาย (Super Admin)", initial: "ส", avatarColor: "#2B2A30" },
    en: { name: "Somchai (Super Admin)", initial: "S", avatarColor: "#2B2A30" },
  },
};
