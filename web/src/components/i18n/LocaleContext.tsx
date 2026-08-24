"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export type Locale = "th" | "en";

const STORAGE_KEY = "aum-locale";

type Listener = () => void;
const listeners = new Set<Listener>();
let currentLocale: Locale = "th";

if (typeof window !== "undefined") {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "th" || stored === "en") currentLocale = stored;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Locale {
  return currentLocale;
}

// SSR/first-hydration pass always reports "th" — matches what the server
// rendered, so React never sees a mismatch. Once hydrated, useSyncExternalStore
// re-renders from getSnapshot() if the store has since changed.
function getServerSnapshot(): Locale {
  return "th";
}

function setStoreLocale(next: Locale) {
  currentLocale = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// Guest pages (Landing, login/register/forgot-password) are Thai-only by
// design and never call useLocale() — this provider only matters to pages
// rendered inside a Sidebar.
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = (next: Locale) => setStoreLocale(next);
  const toggleLocale = () => setStoreLocale(locale === "th" ? "en" : "th");

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
