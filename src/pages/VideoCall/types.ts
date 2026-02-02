// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL TYPES
// Centralized type definitions for the VideoCall module
// ═══════════════════════════════════════════════════════════════════════════════

import { DailyCall, DailyParticipant } from '@daily-co/daily-js';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CallUIProps {
  callObject: DailyCall;
  conversationId: string;
}

export interface NotificationProps {
  id: string;
  type: 'join' | 'leave';
  userName: string;
  onDismiss: (id: string) => void;
}

export interface WaitingRoomProps {
  localParticipant: DailyParticipant | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onLeave: () => void;
  waitingTime: number;
}

export interface VideoTileProps {
  sessionId: string;
  isLocal: boolean;
  displayName: string;
  /** Render variant: default (grid), pip (floating), fullscreen (background) */
  variant?: 'default' | 'pip' | 'fullscreen';
}

export interface FilteredRemoteAudioProps {
  sessionId: string;
}

export interface LoadingScreenProps {
  message: string;
}

export interface ErrorScreenProps {
  onNavigate: () => void;
}

export interface NotificationsOverlayProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

export interface MediaStatusBadgeProps {
  isOn: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  IconOff: React.ComponentType<{ className?: string }>;
}

export interface ControlButtonProps {
  variant: 'secondary' | 'destructive';
  onClick: () => void;
  children: React.ReactNode;
  withHoverScale?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NotificationItem {
  id: string;
  type: 'join' | 'leave';
  userName: string;
}

export type CallState = 'loading' | 'joining' | 'joined' | 'leaving' | 'error';
export type CallIntent = 'start' | 'join';

// ═══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CreateDailyRoomResponse = {
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

// ═══════════════════════════════════════════════════════════════════════════════
// TRACK STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrackState {
  video: boolean;
  audio: boolean;
}
