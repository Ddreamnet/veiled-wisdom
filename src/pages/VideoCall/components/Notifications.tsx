// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL NOTIFICATIONS
// Participant join/leave notification components
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NOTIFICATION_DURATION_MS } from '../utils/constants';
import type { NotificationProps, NotificationsOverlayProps } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANT NOTIFICATION
// Individual notification for join/leave events
// ═══════════════════════════════════════════════════════════════════════════════

export function ParticipantNotification({ id, type, userName, onDismiss }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), NOTIFICATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const isJoin = type === 'join';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md border shadow-lg",
        isJoin
          ? "bg-green-500/20 border-green-500/30 text-green-100"
          : "bg-orange-500/20 border-orange-500/30 text-orange-100"
      )}
    >
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center",
        isJoin ? "bg-green-500/30" : "bg-orange-500/30"
      )}>
        {isJoin ? <UserPlus className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
      </div>
      <div>
        <p className="font-medium text-sm">{userName || 'Katılımcı'}</p>
        <p className="text-xs opacity-80">
          {isJoin ? 'görüşmeye katıldı' : 'görüşmeden ayrıldı'}
        </p>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS OVERLAY
// Container for displaying multiple notifications
// ═══════════════════════════════════════════════════════════════════════════════

export function NotificationsOverlay({ notifications, onDismiss }: NotificationsOverlayProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notif) => (
          <ParticipantNotification
            key={notif.id}
            id={notif.id}
            type={notif.type}
            userName={notif.userName}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
