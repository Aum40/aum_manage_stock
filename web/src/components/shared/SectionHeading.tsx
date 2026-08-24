import { cn } from "@/lib/utils";

export default function SectionHeading({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-heading"
      className={cn(
        "mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase",
        className
      )}
      {...props}
    />
  );
}
