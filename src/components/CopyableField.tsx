import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyableFieldProps {
  label: string;
  value: string;
  className?: string;
}

export function CopyableField({ label, value, className }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div
        onClick={handleCopy}
        className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-secondary/50 cursor-pointer hover:bg-secondary/80 hover:border-primary/30 transition-all group"
      >
        <span className="text-sm font-mono font-medium text-foreground break-all select-all">{value}</span>
        <button
          type="button"
          className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground group-hover:text-primary transition-colors"
          aria-label={`${label} kopyala`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
