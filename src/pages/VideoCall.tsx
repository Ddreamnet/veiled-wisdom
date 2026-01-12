import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DailyProvider } from '@daily-co/daily-react';
import Daily, { DailyCall, DailyParticipant, DailyEventObjectParticipant, DailyEventObjectParticipantLeft } from '@daily-co/daily-js';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, Users, Clock, Phone, UserPlus, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CallUIProps {
  callObject: DailyCall;
}

// Notification component for participant events
interface NotificationProps {
  id: string;
  type: 'join' | 'leave';
  userName: string;
  onDismiss: (id: string) => void;
}

function ParticipantNotification({ id, type, userName, onDismiss }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md border shadow-lg",
        type === 'join' 
          ? "bg-green-500/20 border-green-500/30 text-green-100" 
          : "bg-orange-500/20 border-orange-500/30 text-orange-100"
      )}
    >
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center",
        type === 'join' ? "bg-green-500/30" : "bg-orange-500/30"
      )}>
        {type === 'join' ? (
          <UserPlus className="h-4 w-4" />
        ) : (
          <UserMinus className="h-4 w-4" />
        )}
      </div>
      <div>
        <p className="font-medium text-sm">
          {userName || 'Katılımcı'}
        </p>
        <p className="text-xs opacity-80">
          {type === 'join' ? 'görüşmeye katıldı' : 'görüşmeden ayrıldı'}
        </p>
      </div>
    </motion.div>
  );
}

// Waiting room component
interface WaitingRoomProps {
  localParticipant: DailyParticipant | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onLeave: () => void;
  waitingTime: number;
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex flex-col items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

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
          <p className="text-muted-foreground">
            Diğer katılımcı henüz görüşmeye katılmadı
          </p>
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
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-center"
              >
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <VideoOff className="h-10 w-10 text-primary" />
                </div>
                <p className="text-muted-foreground">Kamera kapalı</p>
              </motion.div>
            </div>
          )}
          
          {/* Camera/Mic status badges */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
              isCameraOn 
                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            )}>
              {isCameraOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
              {isCameraOn ? 'Açık' : 'Kapalı'}
            </div>
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
              isMicOn 
                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            )}>
              {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
              {isMicOn ? 'Açık' : 'Kapalı'}
            </div>
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

        {/* Animated waiting indicator */}
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
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">Bekleniyor...</span>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-3"
        >
          <Button
            size="lg"
            variant={isCameraOn ? "secondary" : "destructive"}
            onClick={onToggleCamera}
            className="h-14 w-14 rounded-full"
          >
            {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            size="lg"
            variant={isMicOn ? "secondary" : "destructive"}
            onClick={onToggleMic}
            className="h-14 w-14 rounded-full"
          >
            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          <Button
            size="lg"
            variant="destructive"
            onClick={onLeave}
            className="h-14 w-14 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
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

function CallUI({ callObject }: CallUIProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callState, setCallState] = useState<'loading' | 'joining' | 'joined' | 'leaving' | 'error'>('loading');
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<DailyParticipant | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'join' | 'leave'; userName: string }>>([]);
  const [waitingTime, setWaitingTime] = useState(0);

  // Waiting time counter
  useEffect(() => {
    const remoteParticipants = participants.filter(p => !p.local);
    if (remoteParticipants.length === 0 && callState === 'joined') {
      const interval = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setWaitingTime(0);
    }
  }, [participants, callState]);

  const addNotification = useCallback((type: 'join' | 'leave', userName: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { id, type, userName }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    const updateParticipants = () => {
      const participantObj = callObject.participants();
      const participantList = Object.values(participantObj);
      const local = participantList.find(p => p.local);
      
      setLocalParticipant(local || null);
      setParticipants(participantList);
    };

    const handleJoinedMeeting = () => {
      console.log('Joined meeting');
      setCallState('joined');
      updateParticipants();
    };

    const handleLeftMeeting = () => {
      console.log('Left meeting');
      setCallState('leaving');
      setTimeout(() => navigate('/messages'), 1000);
    };

    const handleError = (e: any) => {
      console.error('Daily error:', e);
      setCallState('error');
      toast({
        title: "Bağlantı Hatası",
        description: "Video araması başlatılamadı.",
        variant: "destructive",
      });
    };

    const handleParticipantJoined = (event: DailyEventObjectParticipant | undefined) => {
      console.log('Participant joined:', event);
      if (event?.participant && !event.participant.local) {
        addNotification('join', event.participant.user_name || 'Katılımcı');
      }
      updateParticipants();
    };

    const handleParticipantUpdated = (event: DailyEventObjectParticipant | undefined) => {
      updateParticipants();
    };

    const handleParticipantLeft = (event: DailyEventObjectParticipantLeft | undefined) => {
      console.log('Participant left:', event);
      if (event?.participant && !event.participant.local) {
        addNotification('leave', event.participant.user_name || 'Katılımcı');
      }
      updateParticipants();
    };

    updateParticipants();
    
    callObject.on('joined-meeting', handleJoinedMeeting);
    callObject.on('left-meeting', handleLeftMeeting);
    callObject.on('error', handleError);
    callObject.on('participant-joined', handleParticipantJoined);
    callObject.on('participant-updated', handleParticipantUpdated);
    callObject.on('participant-left', handleParticipantLeft);

    return () => {
      callObject.off('joined-meeting', handleJoinedMeeting);
      callObject.off('left-meeting', handleLeftMeeting);
      callObject.off('error', handleError);
      callObject.off('participant-joined', handleParticipantJoined);
      callObject.off('participant-updated', handleParticipantUpdated);
      callObject.off('participant-left', handleParticipantLeft);
    };
  }, [callObject, navigate, toast, addNotification]);

  const toggleCamera = () => {
    callObject.setLocalVideo(!isCameraOn);
    setIsCameraOn(!isCameraOn);
  };

  const toggleMic = () => {
    callObject.setLocalAudio(!isMicOn);
    setIsMicOn(!isMicOn);
  };

  const leaveCall = () => {
    callObject.leave();
  };

  if (callState === 'loading' || callState === 'joining') {
    return (
      <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 mx-auto text-primary" />
          </motion.div>
          <p className="text-lg text-muted-foreground">Görüşme başlatılıyor...</p>
        </motion.div>
      </div>
    );
  }

  if (callState === 'error') {
    return (
      <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-lg text-destructive">Bağlantı hatası oluştu</p>
          <Button onClick={() => navigate('/messages')}>Mesajlara Dön</Button>
        </motion.div>
      </div>
    );
  }

  // Show waiting room if no remote participants
  const remoteParticipants = participants.filter(p => !p.local);
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
        {/* Notifications overlay */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          <AnimatePresence>
            {notifications.map((notif) => (
              <ParticipantNotification
                key={notif.id}
                id={notif.id}
                type={notif.type}
                userName={notif.userName}
                onDismiss={removeNotification}
              />
            ))}
          </AnimatePresence>
        </div>
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
          className="px-4 py-2 bg-green-500/10 border-b border-green-500/20 flex items-center justify-center gap-2"
        >
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-400">Görüşme aktif</span>
          <span className="text-sm text-muted-foreground">• {remoteParticipants.length + 1} katılımcı</span>
        </motion.div>

        {/* Main Video Area - Remote Participants Only */}
        <div className="flex-1 p-4 relative">
          {/* Remote participant(s) - Full screen or grid */}
          <div className={cn(
            "h-full grid gap-4",
            remoteParticipants.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
          )}>
            <AnimatePresence>
              {remoteParticipants.map((participant, index) => (
                <motion.div
                  key={participant.session_id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.1 }}
                  className="h-full"
                >
                  <VideoTile 
                    participant={participant} 
                    isLocal={false}
                    isFullSize={remoteParticipants.length === 1}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Local participant - Small PiP window */}
          {localParticipant && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              className="absolute bottom-4 right-4 w-48 md:w-64 shadow-2xl rounded-xl overflow-hidden border-2 border-primary/30"
            >
              <LocalVideoTile 
                participant={localParticipant}
                isCameraOn={isCameraOn}
              />
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className="p-6 bg-card/50 backdrop-blur-sm border-t border-border"
        >
          <div className="max-w-md mx-auto flex items-center justify-center gap-4">
            <Button
              size="lg"
              variant={isCameraOn ? "secondary" : "destructive"}
              onClick={toggleCamera}
              className="h-14 w-14 rounded-full transition-all hover:scale-110"
            >
              {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
            
            <Button
              size="lg"
              variant={isMicOn ? "secondary" : "destructive"}
              onClick={toggleMic}
              className="h-14 w-14 rounded-full transition-all hover:scale-110"
            >
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>
            
            <Button
              size="lg"
              variant="destructive"
              onClick={leaveCall}
              className="h-14 w-14 rounded-full transition-all hover:scale-110"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Notifications overlay */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications.map((notif) => (
            <ParticipantNotification
              key={notif.id}
              id={notif.id}
              type={notif.type}
              userName={notif.userName}
              onDismiss={removeNotification}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

// Remote participant video tile - full size for main view
function VideoTile({ participant, isLocal, isFullSize }: { participant: DailyParticipant; isLocal: boolean; isFullSize?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      videoRef.current.srcObject = stream;
    }
  }, [participant.videoTrack, participant.session_id]);

  return (
    <div className={cn(
      "relative bg-card rounded-xl overflow-hidden border border-border shadow-lg group",
      isFullSize ? "h-full" : "aspect-video"
    )}>
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
          <span className="text-sm font-medium">
            {participant.user_name || 'Katılımcı'}
          </span>
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

      {!participant.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <div className={cn(
              "rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 ring-4 ring-primary/10",
              isFullSize ? "h-32 w-32" : "h-20 w-20"
            )}>
              <span className={cn(
                "font-bold text-primary",
                isFullSize ? "text-5xl" : "text-3xl"
              )}>
                {participant.user_name?.charAt(0).toUpperCase() || 'K'}
              </span>
            </div>
            <p className={cn(
              "text-muted-foreground",
              isFullSize ? "text-lg" : "text-sm"
            )}>
              {participant.user_name || 'Katılımcı'}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Local participant small PiP tile
function LocalVideoTile({ participant, isCameraOn }: { participant: DailyParticipant; isCameraOn: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      videoRef.current.srcObject = stream;
    }
  }, [participant.videoTrack, participant.session_id]);

  return (
    <div className="relative bg-card aspect-video">
      {isCameraOn && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <VideoOff className="h-6 w-6 text-primary" />
          </div>
        </div>
      )}
      
      {/* "Siz" badge */}
      <div className="absolute bottom-2 left-2">
        <div className="px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full border border-primary/30 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium">Siz</span>
        </div>
      </div>
    </div>
  );
}

export default function VideoCall() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initAttemptedRef = useRef(false);

  useEffect(() => {
    // Strict check - only initialize once per mount
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    let isMounted = true;
    let localCallObject: DailyCall | null = null;
    let joinTimeout: number | null = null;

    const cleanup = () => {
      if (joinTimeout) window.clearTimeout(joinTimeout);
      joinTimeout = null;

      if (localCallObject) {
        console.log('Destroying call object on unmount...');
        localCallObject.destroy();
        localCallObject = null;
      }
    };

    const initializeCall = async () => {
      try {
        if (!conversationId) throw new Error('Conversation ID is required');

        console.log('Initializing call for conversation:', conversationId);

        // Get or create Daily room
        const { data: roomData, error: roomError } = await supabase.functions.invoke('create-daily-room', {
          body: { conversation_id: conversationId },
        });

        if (!isMounted) return;
        if (roomError) {
          console.error('Error creating room:', roomError);
          throw new Error('Failed to create video room');
        }

        console.log('Room data:', roomData);

        // Create Daily call object
        const call = Daily.createCallObject({
          // Robustness guard. We still destroy on unmount.
          allowMultipleCallInstances: true,
        });

        localCallObject = call;

        // IMPORTANT: render UI immediately so user can see self preview (camera) while joining
        setCallObject(call);
        setIsLoading(false);

        // Start camera early to enable local preview ASAP
        try {
          await call.startCamera();
        } catch (e) {
          console.warn('startCamera failed:', e);
        }

        joinTimeout = window.setTimeout(() => {
          if (!isMounted) return;
          setError('Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.');
        }, 20000);

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

        // Join in background (CallUI will transition out of loading when joined-meeting fires)
        await call.join({ url: roomData.room_url });
      } catch (err) {
        console.error('Error initializing call:', err);
        if (!isMounted) return;

        toast({
          title: 'Hata',
          description: 'Video araması başlatılamadı.',
          variant: 'destructive',
        });
        navigate('/messages');
      }
    };

    initializeCall();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [conversationId, navigate, toast]);

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 max-w-sm">
          <p className="text-lg font-semibold">Görüşmeye bağlanılamadı</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => navigate('/messages')}>Mesajlara Dön</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Very first paint while callObject is being created
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
            <p className="text-lg font-medium">Görüşme hazırlanıyor</p>
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
