import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DailyProvider } from '@daily-co/daily-react';
import Daily, { DailyCall, DailyParticipant, DailyEventObjectParticipant, DailyEventObjectParticipantLeft } from '@daily-co/daily-js';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CallUIProps {
  callObject: DailyCall;
}

function CallUI({ callObject }: CallUIProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callState, setCallState] = useState<'loading' | 'joining' | 'joined' | 'leaving' | 'error'>('loading');
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<DailyParticipant | null>(null);

  useEffect(() => {
    const updateParticipants = () => {
      const participantObj = callObject.participants();
      const participantList = Object.values(participantObj);
      const local = participantList.find(p => p.local);
      const remote = participantList.filter(p => !p.local);
      
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
      updateParticipants();
    };

    const handleParticipantUpdated = (event: DailyEventObjectParticipant | undefined) => {
      updateParticipants();
    };

    const handleParticipantLeft = (event: DailyEventObjectParticipantLeft | undefined) => {
      console.log('Participant left:', event);
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
  }, [callObject, navigate, toast]);

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
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Görüşme başlatılıyor...</p>
        </div>
      </div>
    );
  }

  if (callState === 'error') {
    return (
      <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-destructive">Bağlantı hatası oluştu</p>
          <Button onClick={() => navigate('/messages')}>Mesajlara Dön</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {participants.map((participant) => (
          <VideoTile 
            key={participant.session_id} 
            participant={participant} 
            isLocal={participant.local || false} 
          />
        ))}
      </div>

      {/* Controls */}
      <div className="p-6 bg-card/50 backdrop-blur-sm border-t border-border">
        <div className="max-w-md mx-auto flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant={isCameraOn ? "secondary" : "destructive"}
            onClick={toggleCamera}
            className="h-14 w-14 rounded-full"
          >
            {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            size="lg"
            variant={isMicOn ? "secondary" : "destructive"}
            onClick={toggleMic}
            className="h-14 w-14 rounded-full"
          >
            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          <Button
            size="lg"
            variant="destructive"
            onClick={leaveCall}
            className="h-14 w-14 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
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

  return (
    <div className="relative bg-card rounded-xl overflow-hidden aspect-video border border-border shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        className="w-full h-full object-cover"
      />
      {isLocal && (
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-primary/90 rounded-full text-xs font-medium">
          Siz
        </div>
      )}
      {!participant.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-semibold text-primary">
                {participant.user_name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{participant.user_name || 'Kullanıcı'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideoCall() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        if (!conversationId) {
          throw new Error('Conversation ID is required');
        }

        console.log('Initializing call for conversation:', conversationId);

        // Get or create Daily room
        const { data: roomData, error: roomError } = await supabase.functions.invoke('create-daily-room', {
          body: { conversation_id: conversationId }
        });

        if (roomError) {
          console.error('Error creating room:', roomError);
          throw new Error('Failed to create video room');
        }

        console.log('Room data:', roomData);

        // Create Daily call object
        const call = Daily.createCallObject();
        await call.join({ url: roomData.room_url });
        
        setCallObject(call);
        setIsLoading(false);

      } catch (error) {
        console.error('Error initializing call:', error);
        toast({
          title: "Hata",
          description: "Video araması başlatılamadı.",
          variant: "destructive",
        });
        navigate('/messages');
      }
    };

    initializeCall();

    return () => {
      if (callObject) {
        callObject.destroy();
      }
    };
  }, [conversationId, navigate, toast]);

  if (isLoading || !callObject) {
    return (
      <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Görüşme hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <DailyProvider callObject={callObject}>
      <CallUI callObject={callObject} />
    </DailyProvider>
  );
}
