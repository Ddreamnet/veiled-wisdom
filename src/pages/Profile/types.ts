import { LucideIcon } from 'lucide-react';
import { Profile } from '@/lib/supabase';

export interface MobileMenuItem {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  description: string;
}

export interface ProfileState {
  profile: Profile | null;
  username: string;
  bio: string;
  avatarUrl: string;
}

export interface PasswordState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
