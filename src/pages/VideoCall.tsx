import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DailyProvider } from '@daily-co/daily-react';
import Daily, { DailyCall, DailyParticipant, DailyEventObjectParticipant, DailyEventObjectParticipantLeft } from '@daily-co/daily-js';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, Users, Clock, Phone, UserPlus, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

interface CallUIProps {
  callObject: DailyCall;
}

interface NotificationProps {
  id: string;
  type: 'join' | 'leave';
  userName: string;
  onDismiss: (id: string) => void;
}

interface WaitingRoomProps {
  localParticipant: DailyParticipant | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onLeave: () => void;
  waitingTime: number;
}

interface NotificationItem {
  id: string;
  type: 'join' | 'leave';
  userName: string;
}

type CallState = 'loading' | 'joining' | 'joined' | 'leaving' | 'error';
type CallIntent = 'start' | 'join';

type CreateDailyRoomResponse = {
  success: boolean;
  room?: { name: string; url: string };
  createdAt?: string;
  source?: string;
  function_version?: string;
  reused?: boolean;
  active_call?: boolean;
  call_started_at?: string;
  call_created_by?: string;
  error?: { code: string; message: string; details?: unknown };
};

// In-flight mutexes to prevent double init / double room creation per conversation
const initFlowMutex = new Map<string, Promise<void>>();
const createRoomMutex = new Map<string, Promise<CreateDailyRoomResponse>>();

const SOLO_TIMEOUT_SECONDS = 30 * 60; // 30 minutes alone = auto-leave
const MAX_CALL_DURATION_SECONDS = 2 * 60 * 60; // 2 hours max = auto-leave
const NOTIFICATION_DURATION_MS = 4000;
const DUPLICATE_NOTIFICATION_THRESHOLD_MS = 5000;
const JOIN_TIMEOUT_MS = 20000;
const MAX_DURATION_CHECK_INTERVAL_MS = 10000;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function assertValidDailyUrl(urlStr: string): void {
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const isDailyHost = url.hostname === 'daily.co' || url.hostname.endsWith('.daily.co');
  if (!isHttps || !isDailyHost) {
    throw new Error('Oda URL geçersiz. Lütfen daha sonra tekrar deneyin.');
  }
}

function isExpRoomError(e: any): boolean {
  return e?.error?.type === 'exp-room' || e?.errorMsg?.includes('no longer available');
}

function isNoRoomError(e: any): boolean {
  return e?.error?.type === 'no-room' || e?.errorMsg?.includes("does not exist");
}

function parseEdgeFunctionError(roomError: any): { errorCode: string; errorDetails: string; status?: number; functionVersion?: string } {
  const ctx = roomError?.context;
  const status = ctx?.status;
  let errorCode = 'UNKNOWN';
  let errorDetails = '';
  let functionVersion: string | undefined;

  try {
    const bodyStr = typeof ctx?.body === 'string' ? ctx.body : JSON.stringify(ctx?.body || {});
    const parsed = JSON.parse(bodyStr);
    functionVersion = parsed?.function_version;
    errorCode = parsed?.error?.code || parsed?.code || 'UNKNOWN';
    errorDetails = parsed?.error?.message || parsed?.error || parsed?.details || '';
  } catch {
    errorDetails = roomError?.message || 'Unknown error';
  }

  return { errorCode, errorDetails, status, functionVersion };
}

function getErrorMessage(errorCode: string, status?: number): string {
  if (errorCode === 'DAILY_API_KEY_INVALID') return 'Daily API key invalid/for wrong domain. Lütfen yöneticiye başvurun.';
  if (errorCode === 'MISSING_DAILY_API_KEY') return 'Video servisi yapılandırılmamış (DAILY_API_KEY eksik). Lütfen yöneticiye başvurun.';
  if (errorCode === 'DAILY_VERIFY_FAILED') return 'Oda doğrulanamadı (Daily verify failed). Lütfen tekrar deneyin.';
  if (errorCode === 'DAILY_CREATE_FAILED' || errorCode === 'DAILY_FETCH_FAILED') return 'Oda oluşturma başarısız. Lütfen tekrar deneyin.';
  if (errorCode === 'NO_ACTIVE_CALL') return 'Aktif görüşme bulunamadı. Görüşme sona ermiş olabilir.';
  if (status === 401 || errorCode === 'NO_AUTH_HEADER' || errorCode === 'INVALID_JWT') {
    return 'Oturum geçersiz. Lütfen tekrar giriş yapın.';
  }
  if (status === 403 || errorCode === 'NOT_PARTICIPANT') {
    return 'Bu görüşmeye katılma yetkiniz yok.';
  }
  if (status === 404 || errorCode === 'CONVERSATION_NOT_FOUND') {
    return 'Görüşme bulunamadı.';
  }
  return 'Video araması başlatılamadı.';
}

function getParticipantKey(p: DailyParticipant): string {
  const pAny = p as any;
  return pAny?.userData?.appUserId || pAny?.user_id || pAny?.user_name || p.session_id;
}

function isMirrorOfLocal(p: DailyParticipant, local: DailyParticipant | null): boolean {
  if (!local || p.local) return false;

  const lp = local as any;
  const rp = p as any;

  if (lp?.videoTrack?.id && rp?.videoTrack?.id && lp.videoTrack.id === rp.videoTrack.id) return true;
  if (lp?.audioTrack?.id && rp?.audioTrack?.id && lp.audioTrack.id === rp.audioTrack.id) return true;
  if (lp?.userData?.appUserId && rp?.userData?.appUserId && lp.userData.appUserId === rp.userData.appUserId) return true;
  if (lp?.user_id && rp?.user_id && lp.user_id === rp.user_id) return true;
  if (lp?.user_name && rp?.user_name && lp.user_name === rp.user_name) return true;

  const hasAnyIdentity = !!(rp?.userData?.appUserId || rp?.user_id || rp?.user_name);
  if (!hasAnyIdentity && (rp?.videoTrack || rp?.audioTrack)) return true;

  return false;
}

function sanitizeParticipants(participantList: DailyParticipant[]): { local: DailyParticipant | null; sanitized: DailyParticipant[] } {
  const locals = participantList.filter((p) => p.local);
  const local =
    locals.find((p) => !!p.videoTrack) ||
    locals.find((p) => !!p.audioTrack) ||
    locals[0] ||
    null;

  const remoteCandidates = participantList
    .filter((p) => !p.local)
    .filter((p) => !isMirrorOfLocal(p, local));

  const remoteMap = new Map<string, DailyParticipant>();
  for (const p of remoteCandidates) {
    const key = String(getParticipantKey(p));
    const existing = remoteMap.get(key);
    if (!existing) {
      remoteMap.set(key, p);
      continue;
    }
    const existingHasVideo = !!(existing as any).videoTrack;
    const pHasVideo = !!(p as any).videoTrack;
    if (!existingHasVideo && pHasVideo) {
      remoteMap.set(key, p);
    }
  }

  const sanitized: DailyParticipant[] = [
    ...(local ? [local] : []),
    ...Array.from(remoteMap.values()),
  ];

  return { local, sanitized };
}

function logParticipants(raw: DailyParticipant[], sanitized: DailyParticipant[]): void {
  if (!import.meta.env.DEV) return;

  console.log('[VideoCall] participants(raw)', raw.map((p: any) => ({
    session_id: p.session_id,
    local: p.local,
    user_id: p.user_id,
    user_name: p.user_name,
    appUserId: p?.userData?.appUserId,
    videoTrackId: p?.videoTrack?.id,
    audioTrackId: p?.audioTrack?.id,
  })));
  console.log('[VideoCall] participants(sanitized)', sanitized.map((p: any) => ({
    session_id: p.session_id,
    local: p.local,
    user_id: p.user_id,
    user_name: p.user_name,
    appUserId: p?.userData?.appUserId,
  })));
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ParticipantNotification({ id, type, userName, onDismiss }: NotificationProps) {
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

function NotificationsOverlay({ notifications, onDismiss }: { notifications: NotificationItem[]; onDismiss: (id: string) => void }) {
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

function AnimatedBackground() {
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

function MediaStatusBadge({ isOn, Icon, IconOff }: { isOn: boolean; Icon: typeof Video; IconOff: typeof VideoOff }) {
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

function WaitingIndicator() {
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

function ControlButton({ 
  variant, 
  onClick, 
  children, 
  withHoverScale = false 
}: { 
  variant: 'secondary' | 'destructive'; 
  onClick: () => void; 
  children: React.ReactNode;
  withHoverScale?: boolean;
}) {
  return (
    <Button
      size="lg"
      variant={variant}
      onClick={onClick}
      className={cn("h-14 w-14 rounded-full", withHoverScale && "transition-all hover:scale-110")}
    >
      {children}
    </Button>
  );
}

function WaitingRoom({
  localParticipant,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  onLeave,
  waitingTime
}: WaitingRoomProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !localParticipant?.videoTrack) return;
    const stream = new MediaStream([localParticipant.videoTrack]);
    videoRef.current.srcObject = stream;
  }, [localParticipant?.videoTrack]);

  return (
    <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex flex-col items-center justify-center p-4">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 border border-primary/30 mx-auto"
          >
            <Users className="h-8 w-8 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold">Katılımcı Bekleniyor</h1>
          <p className="text-muted-foreground">Diğer katılımcı henüz görüşmeye katılmadı</p>
        </div>

        {/* Self video preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative aspect-video bg-card rounded-2xl overflow-hidden border border-border shadow-2xl"
        >
          {isCameraOn && localParticipant?.videoTrack ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <VideoOff className="h-10 w-10 text-primary" />
                </div>
                <p className="text-muted-foreground">Kamera kapalı</p>
              </motion.div>
            </div>
          )}

          {/* Camera/Mic status badges */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <MediaStatusBadge isOn={isCameraOn} Icon={Video} IconOff={VideoOff} />
            <MediaStatusBadge isOn={isMicOn} Icon={Mic} IconOff={MicOff} />
          </div>

          {/* Waiting time badge */}
          <div className="absolute top-3 right-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center gap-2"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{formatTime(waitingTime)}</span>
            </motion.div>
          </div>
        </motion.div>

        <WaitingIndicator />

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-3"
        >
          <ControlButton variant={isCameraOn ? "secondary" : "destructive"} onClick={onToggleCamera}>
            {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </ControlButton>
          <ControlButton variant={isMicOn ? "secondary" : "destructive"} onClick={onToggleMic}>
            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </ControlButton>
          <ControlButton variant="destructive" onClick={onLeave}>
            <PhoneOff className="h-6 w-6" />
          </ControlButton>
        </motion.div>

        {/* Tip */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground"
        >
          Görüşme bağlantısını diğer katılımcıyla paylaşabilirsiniz
        </motion.p>
      </motion.div>
    </div>
  );
}

function VideoTile({ participant, isLocal }: { participant: DailyParticipant; isLocal: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      videoRef.current.srcObject = stream;
    }
  }, [participant.videoTrack, participant.session_id]);

  const displayName = isLocal ? 'Siz' : (participant.user_name || 'Katılımcı');
  const avatarLetter = isLocal ? 'S' : (participant.user_name?.charAt(0).toUpperCase() || 'K');

  return (
    <div className="relative bg-card rounded-xl overflow-hidden aspect-video border border-border shadow-lg group">
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Name badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-4 flex items-center gap-2"
      >
        <div className="px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full border border-border flex items-center gap-2">
          {isLocal && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
          <span className="text-sm font-medium">{displayName}</span>
        </div>
      </motion.div>

      {/* Mic status indicator */}
      {!participant.audio && (
        <div className="absolute top-4 right-4">
          <div className="p-2 rounded-full bg-red-500/20 border border-red-500/30">
            <MicOff className="h-4 w-4 text-red-400" />
          </div>
        </div>
      )}

      {/* No video placeholder */}
      {!participant.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
            <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 ring-4 ring-primary/10">
              <span className="text-3xl font-bold text-primary">{avatarLetter}</span>
            </div>
            <p className="text-sm text-muted-foreground">{displayName}</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="h-12 w-12 mx-auto text-primary" />
        </motion.div>
        <p className="text-lg text-muted-foreground">{message}</p>
      </motion.div>
    </div>
  );
}

function ErrorScreen({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <p className="text-lg text-destructive">Bağlantı hatası oluştu</p>
        <Button onClick={onNavigate}>Mesajlara Dön</Button>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const recentRef = useRef<Map<string, number>>(new Map());

  const add = useCallback((type: 'join' | 'leave', userName: string) => {
    const dedupeKey = `${type}-${userName || 'unknown'}`;
    const now = Date.now();
    const lastShown = recentRef.current.get(dedupeKey) || 0;

    if (now - lastShown < DUPLICATE_NOTIFICATION_THRESHOLD_MS) {
      if (import.meta.env.DEV) {
        console.log('[VideoCall] Duplicate notification suppressed:', dedupeKey);
      }
      return;
    }

    recentRef.current.set(dedupeKey, now);
    const id = `${now}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, type, userName }]);
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, add, remove };
}

function useCallTimers(
  callState: CallState,
  participants: DailyParticipant[],
  callObject: DailyCall,
  toast: ReturnType<typeof useToast>['toast']
) {
  const [waitingTime, setWaitingTime] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [roomJoinTime, setRoomJoinTime] = useState<number | null>(null);
  const autoNavigateOnLeaveRef = useRef(false);

  const remoteCount = participants.filter((p) => !p.local).length;

  useEffect(() => {
    if (callState === 'joined' && roomJoinTime === null) {
      setRoomJoinTime(Date.now());
    }
  }, [callState, roomJoinTime]);

  useEffect(() => {
    if (remoteCount === 0 && callState === 'joined') {
      const interval = setInterval(() => setWaitingTime((prev) => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [remoteCount, callState]);

  useEffect(() => {
    if (remoteCount > 0 && callState === 'joined') {
      if (callStartTime === null) {
        setCallStartTime(Date.now());
      }
      const interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [remoteCount, callState, callStartTime]);

  useEffect(() => {
    if (waitingTime >= SOLO_TIMEOUT_SECONDS && callState === 'joined') {
      toast({
        title: "Oturum Sonlandırıldı",
        description: "30 dakika boyunca yalnız kaldığınız için görüşme sonlandırıldı.",
        variant: "destructive",
      });
      autoNavigateOnLeaveRef.current = true;
      callObject.leave();
    }
  }, [waitingTime, callState, callObject, toast]);

  useEffect(() => {
    if (!roomJoinTime || callState !== 'joined') return;

    const checkMaxDuration = () => {
      const elapsed = (Date.now() - roomJoinTime) / 1000;
      if (elapsed >= MAX_CALL_DURATION_SECONDS) {
        toast({
          title: "Maksimum Süre Doldu",
          description: "Görüşme 2 saatlik maksimum süreye ulaştığı için sonlandırıldı.",
          variant: "destructive",
        });
        autoNavigateOnLeaveRef.current = true;
        callObject.leave();
      }
    };

    const interval = setInterval(checkMaxDuration, MAX_DURATION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [roomJoinTime, callState, callObject, toast]);

  return { waitingTime, callDuration, autoNavigateOnLeaveRef };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function CallUI({ callObject }: CallUIProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callState, setCallState] = useState<CallState>('loading');
  const callStateRef = useRef<CallState>('loading');

  // Debug: Log all callState transitions
  useEffect(() => {
    callStateRef.current = callState;
    console.log('[CallUI] callState transition:', callState);
  }, [callState]);

  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<DailyParticipant | null>(null);

  const { notifications, add: addNotification, remove: removeNotification } = useNotifications();
  const { waitingTime, callDuration, autoNavigateOnLeaveRef } = useCallTimers(
    callState,
    participants,
    callObject,
    toast
  );

  const updateParticipants = useCallback(() => {
    const participantObj = callObject.participants();
    const participantList = Object.values(participantObj);
    const { local, sanitized } = sanitizeParticipants(participantList);

    setLocalParticipant(local);
    setParticipants(sanitized);

    logParticipants(participantList, sanitized);
  }, [callObject]);

  useEffect(() => {
    // ══════════════════════════════════════════════════════════════════════════
    // FIX: Check CURRENT meeting state immediately on mount
    // This prevents the overlay staying visible if joined-meeting already fired
    // ══════════════════════════════════════════════════════════════════════════
    const currentMeetingState = callObject.meetingState();
    console.log('[CallUI] Initial meeting state on mount:', currentMeetingState);
    
    if (currentMeetingState === 'joined-meeting') {
      console.log('[CallUI] Already joined on mount - transitioning callState to joined');
      setCallState('joined');
      updateParticipants();
    } else if (currentMeetingState === 'joining-meeting') {
      console.log('[CallUI] Currently joining on mount - transitioning callState to joining');
      setCallState('joining');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Event handlers for FUTURE state changes
    // ══════════════════════════════════════════════════════════════════════════
    const handleJoiningMeeting = () => {
      console.log('[CallUI] joining-meeting event fired');
      setCallState('joining');
    };

    const handleJoinedMeeting = () => {
      console.log('[CallUI] joined-meeting event fired');
      setCallState('joined');
      updateParticipants();
    };

    const handleLeftMeeting = () => {
      console.log('[CallUI] left-meeting event fired');
      setCallState('leaving');

      if (autoNavigateOnLeaveRef.current) {
        autoNavigateOnLeaveRef.current = false;
        setTimeout(() => navigate('/messages'), 1000);
      }
    };

    const handleError = (e: any) => {
      console.error('[CallUI] Daily error event:', e);
      setCallState('error');
      toast({
        title: "Bağlantı Hatası",
        description: "Video araması başlatılamadı.",
        variant: "destructive",
      });
    };

    const handleParticipantJoined = (event: DailyEventObjectParticipant | undefined) => {
      console.log('[CallUI] participant-joined event:', event?.participant?.user_name);
      if (event?.participant && !event.participant.local) {
        addNotification('join', event.participant.user_name || 'Katılımcı');
      }
      updateParticipants();
    };

    const handleParticipantUpdated = () => {
      updateParticipants();
    };

    const handleParticipantLeft = (event: DailyEventObjectParticipantLeft | undefined) => {
      console.log('[CallUI] participant-left event:', event?.participant?.user_name);
      if (event?.participant && !event.participant.local) {
        addNotification('leave', event.participant.user_name || 'Katılımcı');
      }
      updateParticipants();
    };

    const handleTrackStarted = (event: any) => {
      console.log('[CallUI] track-started event:', {
        participant: event?.participant?.user_name,
        trackType: event?.track?.kind,
        isLocal: event?.participant?.local
      });
      updateParticipants();
    };

    updateParticipants();

    callObject.on('joining-meeting', handleJoiningMeeting);
    callObject.on('joined-meeting', handleJoinedMeeting);
    callObject.on('left-meeting', handleLeftMeeting);
    callObject.on('error', handleError);
    callObject.on('participant-joined', handleParticipantJoined);
    callObject.on('participant-updated', handleParticipantUpdated);
    callObject.on('participant-left', handleParticipantLeft);
    callObject.on('track-started', handleTrackStarted);

    return () => {
      callObject.off('joining-meeting', handleJoiningMeeting);
      callObject.off('joined-meeting', handleJoinedMeeting);
      callObject.off('left-meeting', handleLeftMeeting);
      callObject.off('error', handleError);
      callObject.off('participant-joined', handleParticipantJoined);
      callObject.off('participant-updated', handleParticipantUpdated);
      callObject.off('participant-left', handleParticipantLeft);
      callObject.off('track-started', handleTrackStarted);
    };
  }, [callObject, navigate, toast, addNotification, updateParticipants, autoNavigateOnLeaveRef]);

  const toggleCamera = useCallback(() => {
    callObject.setLocalVideo(!isCameraOn);
    setIsCameraOn((prev) => !prev);
  }, [callObject, isCameraOn]);

  const toggleMic = useCallback(() => {
    callObject.setLocalAudio(!isMicOn);
    setIsMicOn((prev) => !prev);
  }, [callObject, isMicOn]);

  const leaveCall = useCallback(() => {
    autoNavigateOnLeaveRef.current = true;
    callObject.leave();
  }, [callObject, autoNavigateOnLeaveRef]);

  // Debug: Log overlay visibility decision
  const showLoadingOverlay = callState === 'loading' || callState === 'joining';
  console.log('[CallUI] Overlay visibility check:', { callState, showLoadingOverlay });

  if (showLoadingOverlay) {
    return <LoadingScreen message="Görüşme başlatılıyor..." />;
  }

  if (callState === 'error') {
    return <ErrorScreen onNavigate={() => navigate('/messages')} />;
  }

  const remoteParticipants = participants.filter((p) => !p.local);

  if (remoteParticipants.length === 0) {
    return (
      <>
        <WaitingRoom
          localParticipant={localParticipant}
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          onToggleCamera={toggleCamera}
          onToggleMic={toggleMic}
          onLeave={leaveCall}
          waitingTime={waitingTime}
        />
        <NotificationsOverlay notifications={notifications} onDismiss={removeNotification} />
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex flex-col"
      >
        {/* Connection status bar */}
        <motion.div
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="px-4 py-2 bg-green-500/10 border-b border-green-500/20 flex items-center justify-center gap-3"
        >
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-400">Görüşme aktif</span>
          <span className="text-sm text-muted-foreground">
            • {(localParticipant ? 1 : 0) + remoteParticipants.length} katılımcı
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/50">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{formatTime(callDuration)}</span>
          </div>
        </motion.div>

        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {localParticipant && (
              <motion.div
                key={localParticipant.session_id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: 0 }}
              >
                <VideoTile participant={localParticipant} isLocal={true} />
              </motion.div>
            )}
            {remoteParticipants.map((participant, index) => (
              <motion.div
                key={participant.session_id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: (index + 1) * 0.1 }}
              >
                <VideoTile participant={participant} isLocal={false} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className="p-6 bg-card/50 backdrop-blur-sm border-t border-border"
        >
          <div className="max-w-md mx-auto flex items-center justify-center gap-4">
            <ControlButton variant={isCameraOn ? "secondary" : "destructive"} onClick={toggleCamera} withHoverScale>
              {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </ControlButton>
            <ControlButton variant={isMicOn ? "secondary" : "destructive"} onClick={toggleMic} withHoverScale>
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </ControlButton>
            <ControlButton variant="destructive" onClick={leaveCall} withHoverScale>
              <PhoneOff className="h-6 w-6" />
            </ControlButton>
          </div>
        </motion.div>
      </motion.div>

      <NotificationsOverlay notifications={notifications} onDismiss={removeNotification} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function VideoCall() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get intent from URL query param (default: start)
  const intentFromUrl = searchParams.get('intent') as CallIntent | null;
  const intent: CallIntent = intentFromUrl === 'join' ? 'join' : 'start';

  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initAttemptedRef = useRef(false);
  const callObjectRef = useRef<DailyCall | null>(null);
  const currentRoomUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (initAttemptedRef.current) {
      console.log('[VideoCall] Init already attempted, skipping duplicate');
      return;
    }
    initAttemptedRef.current = true;

    let isMounted = true;
    let joinTimeout: number | null = null;

    const cleanup = () => {
      if (joinTimeout) window.clearTimeout(joinTimeout);
      joinTimeout = null;

      if (callObjectRef.current) {
        console.log('Destroying call object on unmount...');
        try {
          callObjectRef.current.destroy();
        } catch (e) {
          console.warn('Failed to destroy call object:', e);
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
        console.log('[VideoCall] create-daily-room mutex hit; reusing in-flight promise', { mutexKey });
        return await existing;
      }

      const p = (async () => {
        console.log('[VideoCall] Calling create-daily-room edge function...', { intent: effectiveIntent });

        const { data: roomData, error: roomError } = await supabase.functions.invoke('create-daily-room', {
          body: { 
            conversation_id: conversationId, 
            intent: effectiveIntent,
            force_new: opts?.forceNew ?? false 
          },
        });

        console.log('[VideoCall] create-daily-room response:', { roomData, roomError });

        if (roomError) {
          console.error('[VideoCall] create-daily-room error:', roomError);
          const { errorCode, errorDetails, status, functionVersion } = parseEdgeFunctionError(roomError);
          console.error('[VideoCall] Error details:', { errorCode, errorDetails, status, functionVersion });
          throw new Error(`${getErrorMessage(errorCode, status)} (fn: ${functionVersion || 'missing'})`);
        }

        const raw = roomData as any;
        if (!raw) throw new Error('Oda oluşturulamadı. (fn: missing)');

        if (typeof raw.success !== 'boolean') {
          console.error('[VideoCall] NON-STANDARD create-daily-room payload (wrong deployment?)', raw);
          throw new Error('Sunucu yanıtı standart değil (yanlış/stale edge function). (fn: missing)');
        }

        const typed = raw as CreateDailyRoomResponse;
        console.log('[VideoCall] create-daily-room function_version:', typed.function_version ?? 'missing');

        if (!typed.function_version) {
          console.warn('[VideoCall] Missing function_version => likely wrong deployment or stale function');
        }

        if (typed.success !== true) {
          const errorCode = typed.error?.code || 'UNKNOWN';
          console.error('[VideoCall] create-daily-room returned error payload:', typed);
          throw new Error(`${getErrorMessage(errorCode)} (fn: ${typed.function_version || 'missing'})`);
        }

        const roomUrl = typed.room?.url;
        const roomName = typed.room?.name;
        if (!roomUrl || !roomName) {
          console.error('[VideoCall] create-daily-room missing room fields:', typed);
          throw new Error(`Oda oluşturulamadı (eksik yanıt). (fn: ${typed.function_version || 'missing'})`);
        }

        assertValidDailyUrl(roomUrl);

        console.log('[VideoCall] Room ready:', {
          room_name: roomName,
          room_url: roomUrl,
          reused: typed.reused,
          active_call: typed.active_call,
          call_started_at: typed.call_started_at,
          function_version: typed.function_version,
        });

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
        console.log('[VideoCall] Initializing call for conversation:', conversationId, 'intent:', intent);

        // For "start" intent, we might create a new room or join existing active call
        // For "join" intent, we must have an active call
        const roomData = await createRoom({ forceNew: false, callIntent: intent });
        if (!isMounted) return;

        console.log('Room data:', roomData);

        const call = Daily.createCallObject({ allowMultipleCallInstances: true });
        callObjectRef.current = call;

        setCallObject(call);
        setIsLoading(false);

        await requestMediaPermissions();

        try {
          await call.startCamera();
          try {
            (call as any).setLocalAudio?.(true);
          } catch (e) {
            console.warn('[VideoCall] setLocalAudio(true) failed:', e);
          }
        } catch (e) {
          console.warn('startCamera failed:', e);
        }

        joinTimeout = window.setTimeout(() => {
          if (!isMounted) return;
          setError('Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.');
        }, JOIN_TIMEOUT_MS);

        call.on('joined-meeting', () => {
          console.log('Successfully joined meeting');
          if (joinTimeout) window.clearTimeout(joinTimeout);
        });

        call.on('error', (e) => {
          console.error('Daily call error:', e);
          if (joinTimeout) window.clearTimeout(joinTimeout);
          if (!isMounted) return;
          setError('Bağlantı hatası oluştu');
        });

        const displayName = await getDisplayName();
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user ?? null;

        const joinOptions: any = {
          url: roomData.room!.url,
          userName: displayName,
          userData: user?.id ? { appUserId: user.id } : undefined,
          sendSettings: {
            video: { maxQuality: 'high' as const },
          },
        };

        console.log('[VideoCall] Attempting to join room:', roomData.room!.url);

        try {
          await call.join(joinOptions);
          console.log('[VideoCall] Successfully joined room');
        } catch (e: any) {
          console.error('[VideoCall] Initial join failed:', e);

          if (isExpRoomError(e) || isNoRoomError(e)) {
            console.warn('[VideoCall] Room expired/not found. Creating a fresh room...');

            const prevUrl = currentRoomUrlRef.current;
            // Force create a new room (only works for start intent)
            const fresh = await createRoom({ forceNew: true, callIntent: 'start' });
            const freshUrl = fresh.room!.url;

            if (prevUrl && freshUrl === prevUrl) {
              console.error('[VideoCall] Retry returned same room URL (unexpected).');
              throw new Error('Yeni oda oluşturulamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
            }

            console.log('[VideoCall] Retrying join with NEW room:', freshUrl);
            await call.join({ ...joinOptions, url: freshUrl });
          } else {
            throw e;
          }
        }

        try {
          (call as any).setLocalAudio?.(true);
          (call as any).setLocalVideo?.(true);
        } catch (e) {
          console.warn('[VideoCall] Post-join setLocalAudio/Video failed:', e);
        }
      } catch (err) {
        console.error('Error initializing call:', err);
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
        console.log('[VideoCall] initFlow mutex hit; skipping duplicate init', { conversationId });
      } else {
        const p = initializeCall().finally(() => {
          initFlowMutex.delete(conversationId);
        });
        initFlowMutex.set(conversationId, p);
      }
    }

    return () => {
      isMounted = false;
      if (conversationId) initFlowMutex.delete(conversationId);
      cleanup();
    };
  }, [conversationId, intent, navigate, toast]);

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 max-w-sm">
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

  if (isLoading || !callObject) {
    return (
      <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
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
      <CallUI callObject={callObject} />
    </DailyProvider>
  );
}
