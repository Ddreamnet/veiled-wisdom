// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE TYPES
// Domain model types used across the application
// ═══════════════════════════════════════════════════════════════════════════════

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_teacher_approved: boolean;
  created_at: string;
};

export type UserRole = 'customer' | 'teacher' | 'admin';

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  display_order: number;
  created_at: string;
};

export type ConsultationType = 'video' | 'messaging' | 'product';

export type Listing = {
  id: string;
  teacher_id: string;
  category_id: string;
  title: string;
  description: string;
  cover_url: string | null;
  is_active: boolean;
  consultation_type: ConsultationType;
  created_at: string;
};

export type ListingPrice = {
  id: string;
  listing_id: string;
  duration_minutes: number;
  price: number;
};

export type Appointment = {
  id: string;
  listing_id: string;
  customer_id: string;
  teacher_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  start_ts: string;
  end_ts: string;
  duration_minutes: number;
  price_at_booking: number;
  created_at: string;
};

export type Curiosity = {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_url: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  listing_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
};

export type MessageType = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
