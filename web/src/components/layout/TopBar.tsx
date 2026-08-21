"use client";

import { Menu } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMobileNav } from "@/components/layout/MobileNavContext";

interface TopBarProps {
  title: string;
  readOnly?: boolean;
  user: {
    name: string;
    initial: string;
    avatarColor: string;
  };
}

export default function TopBar({ title, readOnly, user }: TopBarProps) {
  const { toggle } = useMobileNav();

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
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {user.name}
        </span>
        <Avatar>
          <AvatarFallback
            className="font-heading font-bold text-white"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.initial}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
