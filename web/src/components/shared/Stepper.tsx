import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onInc: () => void;
  onDec: () => void;
  className?: string;
}

export default function Stepper({ value, onInc, onDec, className }: StepperProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="ลดจำนวน"
        onClick={onDec}
      >
        <Minus />
      </Button>
      <span className="min-w-7.5 text-center font-mono text-sm">
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="เพิ่มจำนวน"
        onClick={onInc}
      >
        <Plus />
      </Button>
    </div>
  );
}
