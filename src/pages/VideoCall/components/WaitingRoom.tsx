// ═══════════════════════════════════════════════════════════════════════════════
// WAITING ROOM COMPONENT
// Displays self-preview while waiting for other participants to join
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Video, VideoOff, Mic, MicOff, PhoneOff, Clock } from 'lucide-react';
import { formatTime } from '../utils/helpers';
import { AnimatedBackground, MediaStatusBadge, WaitingIndicator, ControlButton } from './UIElements';
import type { WaitingRoomProps } from '../types';

export function WaitingRoom({
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
