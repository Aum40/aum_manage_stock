import { Progress } from "@/components/ui/progress";
import Caption from "@/components/shared/Caption";
import { cn } from "@/lib/utils";

interface QuotaMeterProps {
  label: string;
  used: number;
  /** null = ไม่จำกัด (เช่น maxActiveProducts ของแพ็กเกจที่ไม่ตั้ง cap) */
  total: number | null;
  caption?: string;
  className?: string;
  /** Use light-on-dark text colors — for placing this on the dark sidebar. */
  onDark?: boolean;
}

// Business rule from the approved design: the fill turns brick-red once
// usage hits 90% or more, so an owner notices before actually hitting the
// hard limit.
const CRITICAL_THRESHOLD = 0.9;

export default function QuotaMeter({
  label,
  used,
  total,
  caption,
  className,
  onDark,
}: QuotaMeterProps) {
  const isUnlimited = total === null;
  const pct = isUnlimited || total === 0 ? 0 : Math.min(used / total, 1) * 100;
  const isCritical = !isUnlimited && total > 0 && used / total >= CRITICAL_THRESHOLD;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-[11px] tracking-[0.08em] uppercase",
            onDark ? "text-white/50" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "font-mono text-sm font-bold whitespace-nowrap",
            isCritical
              ? "text-destructive"
              : onDark
                ? "text-white"
                : "text-foreground"
          )}
        >
          {used} / {isUnlimited ? "∞" : total}
        </span>
      </div>
      <Progress
        value={pct}
        trackClassName={cn("h-2", onDark && "bg-white/10")}
        indicatorClassName={cn(isCritical && "bg-destructive")}
      />
      {caption && (
        <Caption className={onDark ? "text-white/40" : undefined}>
          {caption}
        </Caption>
      )}
    </div>
  );
}
