"use client";

import { useLocale } from "@/components/i18n/LocaleContext";
import { cn } from "@/lib/utils";

export default function LanguageToggle({ onDark = true }: { onDark?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={cn("box-border grid h-7 w-20 shrink-0 grid-cols-2 overflow-hidden rounded-full border p-0", onDark ? "border-white/20 bg-white/5" : "border-brand-dark bg-background")}>
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            "font-language-toggle h-full min-w-0 appearance-none rounded-none border-0 p-0 text-center text-[10px] font-semibold leading-none tracking-wide transition-all",
            l === locale
              ? onDark ? "bg-primary text-brand-dark" : "bg-brand-dark text-white"
                : onDark
                  ? "text-white/40"
                  : "text-muted-foreground"
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
