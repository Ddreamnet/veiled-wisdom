import { useState, useCallback, useRef } from 'react';
import { devLog } from '@/lib/debug';

// ═══════════════════════════════════════════════════════════════════════════════
// CALL NOTIFICATIONS HOOK
// Manages participant join/leave notification state with deduplication
// ═══════════════════════════════════════════════════════════════════════════════

export interface NotificationItem {
  id: string;
  type: 'join' | 'leave';
  userName: string;
}

const DUPLICATE_NOTIFICATION_THRESHOLD_MS = 5000;

export function useCallNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const recentRef = useRef<Map<string, number>>(new Map());

  const addNotification = useCallback((type: 'join' | 'leave', userName: string) => {
    const dedupeKey = `${type}-${userName || 'unknown'}`;
    const now = Date.now();
    const lastShown = recentRef.current.get(dedupeKey) || 0;

    // Deduplicate notifications within threshold
    if (now - lastShown < DUPLICATE_NOTIFICATION_THRESHOLD_MS) {
      devLog('CallNotifications', 'Duplicate notification suppressed:', dedupeKey);
      return;
    }

    recentRef.current.set(dedupeKey, now);
    const id = `${now}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, type, userName }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    recentRef.current.clear();
  }, []);

  return { 
    notifications, 
    addNotification, 
    removeNotification,
    clearAllNotifications,
  };
}
