"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const STORAGE_KEY = "aum-selected-shop";

type Listener = () => void;
const listeners = new Set<Listener>();
let currentShopId: string | null = null;

if (typeof window !== "undefined") {
  currentShopId = window.localStorage.getItem(STORAGE_KEY);
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null {
  return currentShopId;
}

// SSR/first-hydration pass reports null (no shop picked yet) — the caller
// falls back to the first shop from useShops() until this hydrates, same
// pattern as LocaleContext.
function getServerSnapshot(): string | null {
  return null;
}

function setStoreShopId(next: string | null) {
  currentShopId = next;
  if (next === null) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, next);
  }
  listeners.forEach((listener) => listener());
}

interface SelectedShopContextValue {
  selectedShopId: string | null;
  setSelectedShopId: (id: string) => void;
}

const SelectedShopContext = createContext<SelectedShopContextValue | null>(null);

export function SelectedShopProvider({ children }: { children: React.ReactNode }) {
  const selectedShopId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <SelectedShopContext.Provider
      value={{ selectedShopId, setSelectedShopId: setStoreShopId }}
    >
      {children}
    </SelectedShopContext.Provider>
  );
}

export function useSelectedShop() {
  const ctx = useContext(SelectedShopContext);
  if (!ctx) {
    throw new Error("useSelectedShop must be used within a SelectedShopProvider");
  }
  return ctx;
}
