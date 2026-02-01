// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL UI ELEMENTS
// Small reusable UI components: badges, buttons, indicators, backgrounds
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { MediaStatusBadgeProps, ControlButtonProps } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED BACKGROUND
// Subtle animated gradient blobs for visual interest
// ═══════════════════════════════════════════════════════════════════════════════

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA STATUS BADGE
// Shows camera/mic on/off status with colored indicator
// ═══════════════════════════════════════════════════════════════════════════════

export function MediaStatusBadge({ isOn, Icon, IconOff }: MediaStatusBadgeProps) {
  return (
    <div className={cn(
      "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
      isOn
        ? "bg-green-500/20 text-green-400 border border-green-500/30"
        : "bg-red-500/20 text-red-400 border border-red-500/30"
    )}>
      {isOn ? <Icon className="h-3 w-3" /> : <IconOff className="h-3 w-3" />}
      {isOn ? 'Açık' : 'Kapalı'}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WAITING INDICATOR
// Animated dots showing "waiting" state
// ═══════════════════════════════════════════════════════════════════════════════

export function WaitingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex items-center justify-center gap-3 py-4"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">Bekleniyor...</span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL BUTTON
// Round button for camera/mic/leave controls
// ═══════════════════════════════════════════════════════════════════════════════

export function ControlButton({ 
  variant, 
  onClick, 
  children, 
  withHoverScale = false,
  className 
}: ControlButtonProps) {
  return (
    <Button
      size="lg"
      variant={variant}
      onClick={onClick}
      className={cn("h-14 w-14 rounded-full", withHoverScale && "transition-all hover:scale-110", className)}
    >
      {children}
    </Button>
  );
}
