import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { devLog, devWarn } from '@/lib/debug';

// Stable device ID persisted in localStorage
function getDeviceId(): string {
  const key = 'push_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getPlatform(): 'android' | 'ios' | 'web' {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  return 'web';
}

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const registeredRef = useRef(false);
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const handleNotificationTap = useCallback(
    (data: Record<string, string>) => {
      const type = data?.type;
      devLog('Push', 'Notification tapped:', type, data);

      switch (type) {
        case 'chat':
          if (data.conversationId) {
            navigate(`/messages?conversationId=${data.conversationId}`);
          } else {
            navigate('/messages');
          }
          break;
        case 'appointment':
          navigate('/appointments');
          break;
        case 'admin_payment':
          navigate('/admin/payments');
          break;
        case 'admin_approval':
          navigate('/admin/approvals');
          break;
        default:
          devWarn('Push', 'Unknown notification type:', type);
      }
    },
    [navigate]
  );

  // Register for push notifications
  useEffect(() => {
    if (!user || registeredRef.current) return;

    let cancelled = false;

    async function register() {
      try {
        // Dynamic import — only load Capacitor push plugin when needed
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Check permission
        const permResult = await PushNotifications.checkPermissions();
        if (permResult.receive === 'prompt' || permResult.receive === 'prompt-with-rationale') {
          const reqResult = await PushNotifications.requestPermissions();
          if (reqResult.receive !== 'granted') {
            devLog('Push', 'Permission denied');
            return;
          }
        } else if (permResult.receive !== 'granted') {
          devLog('Push', 'Permission not granted:', permResult.receive);
          return;
        }

        if (cancelled) return;

        // Create Android notification channels
        const platform = getPlatform();
        if (platform === 'android') {
          try {
            await (PushNotifications as any).createChannel?.({
              id: 'messages',
              name: 'Mesajlar',
              importance: 4, // HIGH
              sound: 'default',
              vibration: true,
            });
            await (PushNotifications as any).createChannel?.({
              id: 'appointments',
              name: 'Randevular',
              importance: 4,
              sound: 'default',
              vibration: true,
            });
            await (PushNotifications as any).createChannel?.({
              id: 'admin',
              name: 'Yönetim',
              importance: 3, // DEFAULT
              sound: 'default',
            });
          } catch {
            // createChannel may not be available on all versions
          }
        }

        // Registration listener
        const regListener = await PushNotifications.addListener(
          'registration',
          async (token) => {
            devLog('Push', 'Registered with token');
            const deviceId = getDeviceId();

            const { error } = await supabase.from('push_devices').upsert(
              {
                user_id: user!.id,
                device_id: deviceId,
                fcm_token: token.value,
                platform,
                enabled: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,device_id' }
            );

            if (error) {
              devWarn('Push', 'Token upsert failed:', error.message);
            }
          }
        );

        // Registration error
        const regErrorListener = await PushNotifications.addListener(
          'registrationError',
          (err) => {
            devWarn('Push', 'Registration error:', err);
          }
        );

        // Notification tap (app was in background/killed)
        const actionListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            const data = action.notification?.data || {};
            handleNotificationTap(data);
          }
        );

        // Store cleanup
        listenerCleanupRef.current = () => {
          regListener.remove();
          regErrorListener.remove();
          actionListener.remove();
        };

        // Register
        await PushNotifications.register();
        registeredRef.current = true;
      } catch (err) {
        // Silently fail on web or when Capacitor is not available
        devLog('Push', 'Registration skipped (not native?):', err);
      }
    }

    register();

    return () => {
      cancelled = true;
    };
  }, [user, handleNotificationTap]);

  // Handle sign-out: disable device token
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        registeredRef.current = false;
        listenerCleanupRef.current?.();
        listenerCleanupRef.current = null;

        const deviceId = getDeviceId();
        await supabase
          .from('push_devices')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('device_id', deviceId);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}
