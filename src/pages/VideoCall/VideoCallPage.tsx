// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL PAGE
// Main entry component for video calls
// Handles URL parsing, room creation, and Daily.co initialization
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DailyProvider } from '@daily-co/daily-react';
import Daily, { DailyCall } from '@daily-co/daily-js';
import { motion } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { useSetAtom } from 'jotai';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { devLog } from '@/lib/debug';
import { isChatOpenAtom } from '@/atoms/chatAtoms';

// Types
import type { CallIntent, CreateDailyRoomResponse } from './types';

// Constants
import { JOIN_TIMEOUT_MS } from './utils/constants';

// Utilities
import { 
  assertValidDailyUrl, 
  isExpRoomError, 
  isNoRoomError, 
  parseEdgeFunctionError, 
  getErrorMessage 
} from './utils/helpers';
import { cleanupConversationTrackStates } from './utils/participantUtils';

// Components
import { CallUI } from './CallUI';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE-LEVEL MUTEXES
// Prevent double initialization and room creation per conversation
// Persists across React StrictMode double-mounts
// ═══════════════════════════════════════════════════════════════════════════════
const initFlowMutex = new Map<string, Promise<void>>();
const createRoomMutex = new Map<string, Promise<CreateDailyRoomResponse>>();

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function VideoCallPage() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const setIsChatOpen = useSetAtom(isChatOpenAtom);

  const intent: CallIntent = searchParams.get('intent') === 'join' ? 'join' : 'start';

  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const callObjectRef = useRef<DailyCall | null>(null);
  const currentRoomUrlRef = useRef<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HIDE MOBILE NAVBAR FOR ENTIRE VIDEO CALL PAGE (including loading/error states)
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    setIsChatOpen(true);
    return () => setIsChatOpen(false);
  }, [setIsChatOpen]);

  useEffect(() => {
    if (!conversationId) {
      navigate('/messages');
      return;
    }

    let isMounted = true;
    let joinTimeout: number | null = null;

    const cleanup = () => {
      if (joinTimeout) window.clearTimeout(joinTimeout);
      joinTimeout = null;

      if (callObjectRef.current) {
        devLog('VideoCall', 'Destroying call object on unmount...');
        try {
          callObjectRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        callObjectRef.current = null;
      }
    };

    const requestMediaPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        console.warn('[VideoCall] getUserMedia permission check failed:', e);
        toast({
          title: 'Mikrofon izni gerekli',
          description: 'Görüşmede ses iletimi için mikrofon izni vermelisiniz.',
          variant: 'destructive',
        });
      }
    };

    const createRoom = async (opts?: { forceNew?: boolean; callIntent?: CallIntent }): Promise<CreateDailyRoomResponse> => {
      if (!conversationId) throw new Error('Conversation ID is required');

      const effectiveIntent = opts?.callIntent ?? intent;
      const mutexKey = `${conversationId}:${effectiveIntent}:${opts?.forceNew ? 'forceNew' : 'reuse'}`;
      const existing = createRoomMutex.get(mutexKey);
      if (existing) {
        devLog('VideoCall', 'create-daily-room mutex hit; reusing in-flight promise');
        return await existing;
      }

      const p = (async () => {
        devLog('VideoCall', 'Calling create-daily-room edge function...', { intent: effectiveIntent });

        const { data: roomData, error: roomError } = await supabase.functions.invoke('create-daily-room', {
          body: { 
            conversation_id: conversationId, 
            intent: effectiveIntent,
            force_new: opts?.forceNew ?? false 
          },
        });

        devLog('VideoCall', 'create-daily-room response:', { success: roomData?.success, error: !!roomError });

        if (roomError) {
          console.error('[VideoCall] create-daily-room error:', roomError);
          const { errorCode, errorDetails, status, functionVersion } = parseEdgeFunctionError(roomError);
          throw new Error(`${getErrorMessage(errorCode, status)} (fn: ${functionVersion || 'missing'})`);
        }

        const raw = roomData as any;
        if (!raw) throw new Error('Oda oluşturulamadı. (fn: missing)');

        if (typeof raw.success !== 'boolean') {
          console.error('[VideoCall] NON-STANDARD create-daily-room payload (wrong deployment?)');
          throw new Error('Sunucu yanıtı standart değil (yanlış/stale edge function). (fn: missing)');
        }

        const typed = raw as CreateDailyRoomResponse;
        devLog('VideoCall', 'function_version:', typed.function_version ?? 'missing');

        if (typed.success !== true) {
          const errorCode = typed.error?.code || 'UNKNOWN';
          throw new Error(`${getErrorMessage(errorCode)} (fn: ${typed.function_version || 'missing'})`);
        }

        const roomUrl = typed.room?.url;
        const roomName = typed.room?.name;
        if (!roomUrl || !roomName) {
          throw new Error(`Oda oluşturulamadı (eksik yanıt). (fn: ${typed.function_version || 'missing'})`);
        }

        assertValidDailyUrl(roomUrl);

        devLog('VideoCall', 'Room ready:', roomName, typed.reused ? '(reused)' : '(new)');

        currentRoomUrlRef.current = roomUrl;
        return typed;
      })().finally(() => {
        createRoomMutex.delete(mutexKey);
      });

      createRoomMutex.set(mutexKey, p);
      return await p;
    };

    const getDisplayName = async (): Promise<string> => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      return (
        (user?.user_metadata as any)?.username ||
        (user?.user_metadata as any)?.full_name ||
        user?.email?.split('@')[0] ||
        'Kullanıcı'
      );
    };

    const initializeCall = async () => {
      try {
        if (!conversationId) throw new Error('Conversation ID is required');
        devLog('VideoCall', 'Initializing call:', conversationId, intent);

        const initStart = performance.now();

        // OPTIMIZATION 1: Create CallObject IMMEDIATELY (before room fetch)
        const call = Daily.createCallObject({ allowMultipleCallInstances: true });
        callObjectRef.current = call;
        setCallObject(call);
        setIsLoading(false);
        devLog('VideoCall', 'CallObject created at', Math.round(performance.now() - initStart), 'ms');

        // OPTIMIZATION 2: Check for roomUrl from query param (joiner shortcut)
        const roomUrlFromParam = searchParams.get('roomUrl');
        
        // OPTIMIZATION 3: Run room fetch, displayName, auth in PARALLEL
        const roomPromise = roomUrlFromParam && intent === 'join'
          ? Promise.resolve({ room: { url: roomUrlFromParam, name: 'cached' } } as CreateDailyRoomResponse)
          : createRoom({ forceNew: false, callIntent: intent });

        const [roomData, displayName, authData] = await Promise.all([
          roomPromise,
          getDisplayName(),
          supabase.auth.getUser(),
        ]);

        if (!isMounted) return;
        devLog('VideoCall', 'Parallel fetches done');

        const user = authData?.data?.user ?? null;
        const roomUrl = roomData.room!.url;
        currentRoomUrlRef.current = roomUrl;

        // OPTIMIZATION 4: preAuth + startCamera in PARALLEL for faster join
        // preAuth() prepares WebRTC connection before join() is called
        devLog('VideoCall', 'Starting preAuth + camera in parallel');
        await Promise.all([
          call.preAuth({ url: roomUrl }).catch((e) => {
            console.warn('[VideoCall] preAuth failed (continuing):', e);
          }),
          call.startCamera({ url: roomUrl }).then(() => {
            try {
              (call as any).setLocalAudio?.(true);
            } catch {
              // Ignore audio setup errors
            }
          }).catch(() => {}),
        ]);
        devLog('VideoCall', 'preAuth + camera ready');

        joinTimeout = window.setTimeout(() => {
          if (!isMounted) return;
          setError('Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.');
        }, JOIN_TIMEOUT_MS);

        call.on('joined-meeting', () => {
          devLog('VideoCall', 'Successfully joined meeting');
          if (joinTimeout) window.clearTimeout(joinTimeout);
        });

        call.on('error', (e) => {
          console.error('[VideoCall] Daily call error:', e);
          if (joinTimeout) window.clearTimeout(joinTimeout);
          if (!isMounted) return;
          setError('Bağlantı hatası oluştu');
        });

        const joinOptions: any = {
          url: roomUrl,
          userName: displayName,
          userData: user?.id ? { appUserId: user.id } : undefined,
          sendSettings: {
            video: { maxQuality: 'high' as const },
          },
        };

        devLog('VideoCall', 'Attempting to join room');

        try {
          await call.join(joinOptions);
          devLog('VideoCall', 'Successfully joined room');
        } catch (e: any) {
          console.error('[VideoCall] Initial join failed:', e);

          if (isExpRoomError(e) || isNoRoomError(e)) {
            devLog('VideoCall', 'Room expired/not found. Creating a fresh room...');

            const prevUrl = currentRoomUrlRef.current;
            const fresh = await createRoom({ forceNew: true, callIntent: 'start' });
            const freshUrl = fresh.room!.url;

            if (prevUrl && freshUrl === prevUrl) {
              throw new Error('Yeni oda oluşturulamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
            }

            devLog('VideoCall', 'Retrying join with NEW room');
            await call.join({ ...joinOptions, url: freshUrl });
          } else {
            throw e;
          }
        }

        try {
          (call as any).setLocalAudio?.(true);
          (call as any).setLocalVideo?.(true);
        } catch {
          // Ignore post-join media setup errors
        }

        devLog('VideoCall', 'Init complete');
      } catch (err) {
        console.error('[VideoCall] Error initializing call:', err);
        if (!isMounted) return;

        const message = err instanceof Error ? err.message : 'Video araması başlatılamadı.';
        setError(message);

        toast({
          title: 'Hata',
          description: message,
          variant: 'destructive',
        });
      }
    };

    if (conversationId) {
      const existingInit = initFlowMutex.get(conversationId);
      if (existingInit) {
        devLog('VideoCall', 'initFlow mutex hit; waiting existing init');

        (async () => {
          try {
            await existingInit;
          } catch {
            // Ignore
          }

          if (!isMounted) return;

          if (!callObjectRef.current) {
            devLog('VideoCall', 'No callObject after waiting; starting fresh init');
            const p = initializeCall().finally(() => {
              initFlowMutex.delete(conversationId);
            });
            initFlowMutex.set(conversationId, p);
          }
        })();
      } else {
        const p = initializeCall().finally(() => {
          initFlowMutex.delete(conversationId);
        });
        initFlowMutex.set(conversationId, p);
      }
    }

    return () => {
      isMounted = false;
      if (conversationId) {
        initFlowMutex.delete(conversationId);
        cleanupConversationTrackStates(conversationId);
      }
      cleanup();
    };
  }, [conversationId, intent, navigate, toast, searchParams]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  if (error) {
    return (
      <div className="fixed inset-0 z-40 bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center p-4 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center space-y-4 max-w-sm"
        >
          <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <PhoneOff className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-lg font-semibold">Görüşmeye bağlanılamadı</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/messages')}>Mesajlara Dön</Button>
            <Button onClick={() => window.location.reload()}>Tekrar Dene</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!callObject) {
    return (
      <div className="fixed inset-0 z-40 bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="text-center space-y-6"
        >
          <div className="relative h-24 w-24 mx-auto">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Phone className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {intent === 'join' ? 'Görüşmeye katılınıyor' : 'Görüşme hazırlanıyor'}
            </p>
            <p className="text-sm text-muted-foreground">Lütfen bekleyin...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <DailyProvider callObject={callObject}>
      <CallUI callObject={callObject} conversationId={conversationId!} />
    </DailyProvider>
  );
}
