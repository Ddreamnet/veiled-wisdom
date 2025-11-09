import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

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
  created_at: string;
};

export type Listing = {
  id: string;
  teacher_id: string;
  category_id: string;
  title: string;
  description: string;
  cover_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type ListingPrice = {
  id: string;
  listing_id: string;
  duration_minutes: 30 | 45 | 60;
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
