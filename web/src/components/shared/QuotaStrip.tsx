import { cn } from "@/lib/utils";

export default function QuotaStrip({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="quota-strip"
      className={cn(
        "flex items-center gap-8 rounded-2xl bg-secondary px-5 py-3.5",
        className
      )}
      {...props}
    />
  );
}
