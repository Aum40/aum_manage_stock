import { Badge } from "@/components/ui/badge";

interface PlanBadgeProps {
  plan: "FREE" | "PLUS" | "PRO";
  className?: string;
}

export default function PlanBadge({ plan, className }: PlanBadgeProps) {
  return (
    <Badge
      variant={plan === "FREE" ? "neutral" : "default"}
      className={className}
    >
      {plan}
    </Badge>
  );
}
