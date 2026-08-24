"use client";

import { useLocale } from "@/components/i18n/LocaleContext";
import { cn } from "@/lib/utils";

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex gap-0.5 rounded-full bg-white/5 p-1">
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            "flex-1 rounded-full py-1.5 text-[11px] font-bold tracking-wide transition-all",
            l === locale ? "bg-primary text-brand-dark" : "text-white/40"
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
