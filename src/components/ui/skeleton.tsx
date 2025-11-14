import { cn } from "@/lib/utils";

function Skeleton({ 
  className, 
  variant = "default",
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "shimmer" | "pulse" | "wave";
}) {
  const variantClasses = {
    default: "animate-pulse bg-muted",
    shimmer: "skeleton-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
    pulse: "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] bg-muted",
    wave: "skeleton-wave bg-muted",
  };

  return (
    <div 
      className={cn(
        "rounded-md overflow-hidden",
        variantClasses[variant],
        className
      )} 
      {...props} 
    />
  );
}

export { Skeleton };
