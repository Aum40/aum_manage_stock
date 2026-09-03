"use client";

import { createContext, useContext, useState } from "react";

interface MobileNavContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

// Drawer open/closed state, shared between TopBar (hamburger button, one per
// page) and Sidebar (the drawer itself, rendered once per route-group layout).
// Purely ephemeral UI state — not persisted, unlike LocaleContext.
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value: MobileNavContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };

  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within a MobileNavProvider");
  }
  return ctx;
}
