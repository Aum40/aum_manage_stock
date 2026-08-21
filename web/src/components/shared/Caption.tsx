import { cn } from "@/lib/utils";

export default function Caption({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="caption"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
