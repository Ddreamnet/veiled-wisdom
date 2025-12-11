import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, min = 0, max = Infinity, step = 1, suffix, ...props }, ref) => {
    const handleIncrement = () => {
      const numValue = parseFloat(value) || 0;
      const newValue = Math.min(numValue + step, max);
      onChange(newValue.toString());
    };

    const handleDecrement = () => {
      const numValue = parseFloat(value) || 0;
      const newValue = Math.max(numValue - step, min);
      onChange(newValue.toString());
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (newValue === '' || /^\d*\.?\d*$/.test(newValue)) {
        onChange(newValue);
      }
    };

    return (
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={parseFloat(value) <= min}
          className="h-10 w-10 rounded-r-none border-r-0 bg-muted/50 hover:bg-muted"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            ref={ref}
            value={value}
            onChange={handleChange}
            className={cn(
              "flex h-10 w-full border border-input bg-background px-3 py-2 text-center text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              suffix && "pr-8",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={parseFloat(value) >= max}
          className="h-10 w-10 rounded-l-none border-l-0 bg-muted/50 hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";

export { NumberInput };
