import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, differenceInMinutes, differenceInHours, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

const HEARTBEAT_INTERVAL = 60000; // 60 saniye
const ACTIVE_THRESHOLD_MINUTES = 2; // 2 dakika içinde aktif sayılır

export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updatePresence = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating presence:', error);
      }
    } catch (err) {
      console.error('Error in updatePresence:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // İlk güncelleme
    updatePresence();

    // Periyodik güncelleme
    intervalRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Sayfa görünür olduğunda güncelle
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, updatePresence]);

  return { updatePresence };
}

// Aktiflik durumunu formatla
export function formatPresenceStatus(lastSeen: string | null): { text: string; isOnline: boolean } {
  if (!lastSeen) {
    return { text: 'Çevrimdışı', isOnline: false };
  }

  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const minutesAgo = differenceInMinutes(now, lastSeenDate);
  const hoursAgo = differenceInHours(now, lastSeenDate);

  // Son 2 dakika içinde aktif
  if (minutesAgo < ACTIVE_THRESHOLD_MINUTES) {
    return { text: 'Aktif', isOnline: true };
  }

  // Son 1 saat içinde
  if (minutesAgo < 60) {
    return { text: `${minutesAgo} dk önce aktifti`, isOnline: false };
  }

  // Son 24 saat içinde
  if (hoursAgo < 24) {
    return { text: `${hoursAgo} saat önce aktifti`, isOnline: false };
  }

  // Dün
  if (isYesterday(lastSeenDate)) {
    return { text: `Dün ${format(lastSeenDate, 'HH:mm', { locale: tr })}`, isOnline: false };
  }

  // Daha eski
  return { 
    text: format(lastSeenDate, 'd MMM HH:mm', { locale: tr }), 
    isOnline: false 
  };
}
