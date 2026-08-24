import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  Users,
  History,
  BookOpen,
  Store,
  CreditCard,
  User,
  UserCog,
  Building2,
} from "lucide-react";

import PlanBadge from "@/components/shared/PlanBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleContext";
import type {
  IconKey,
  NavItem as NavItemType,
} from "@/components/layout/nav-config";

// Icons are resolved here (inside this Client Component) rather than stored
// as component references in nav-config.ts — see the comment there for why.
const iconMap: Record<IconKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  package: Package,
  cart: ShoppingCart,
  message: MessageSquare,
  users: Users,
  history: History,
  catalog: BookOpen,
  store: Store,
  card: CreditCard,
  user: User,
  userCog: UserCog,
  building: Building2,
};

interface NavItemProps {
  item: NavItemType;
  isActive: boolean;
}

export default function NavItem({ item, isActive }: NavItemProps) {
  const { locale } = useLocale();
  const Icon = iconMap[item.icon];

  const content = (
    <span
      className={cn(
        "mb-0.5 flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-opacity",
        isActive
          ? "bg-primary font-semibold text-brand-dark"
          : "text-white/60",
        item.locked && "pointer-events-none opacity-45"
      )}
    >
      <Icon className="size-4 shrink-0 opacity-70" />
      <span className="flex-1">{item.label[locale]}</span>
      {item.locked && <PlanBadge plan={item.locked} className="shrink-0" />}
    </span>
  );

  if (item.locked) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{content}</TooltipTrigger>
        <TooltipContent>
          {locale === "th"
            ? "อัปเกรดแพ็กเกจเพื่อปลดล็อกฟีเจอร์นี้"
            : "Upgrade your plan to unlock this feature"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} className="block rounded-full hover:bg-white/5">
      {content}
    </Link>
  );
}
