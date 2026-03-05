import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://egjuybvfhxazpvbeaupy.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnanV5YnZmaHhhenB2YmVhdXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDYzMTksImV4cCI6MjA3ODI4MjMxOX0.PFlgJ72CUI8Y4LQl_NPW6TwztcDc0eIFflTfar_Q18c';

// Alias kept for edge-function headers (useCallTermination.ts)
export const supabaseAnonKeyPublic = supabaseAnonKey;

// Note: The anon key is public by design. Service role key must NEVER be used in the browser.

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'lovable-app',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Re-export types from dedicated module for backward compatibility
export type {
  Profile,
  UserRole,
  Category,
  ConsultationType,
  Listing,
  ListingPrice,
  Appointment,
  Curiosity,
  Review,
} from '@/types/database';
