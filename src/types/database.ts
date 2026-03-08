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

// ═══════════════════════════════════════════════════════════════════════════════
// ENRICHED / JOINED TYPES
// Used by query hooks and components that work with enriched data
// ═══════════════════════════════════════════════════════════════════════════════

/** Profile summary embedded in listing cards */
export type ListingProfileSummary = {
  username: string;
  avatar_url: string | null;
};

/** Listing enriched with teacher profile and minimum price — used in listing grids/cards */
export type ListingWithProfile = Listing & {
  profiles: ListingProfileSummary;
  minPrice?: number;
};

// ═══════════════════════════════════════════════════════════════════════════════

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
  payment_request_id: string | null;
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

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT SYSTEM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BankAccount = {
  id: string;
  bank_name: string;
  iban: string;
  account_holder: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

export type PaymentRequestStatus = 'pending' | 'confirmed' | 'rejected';
export type PaymentItemType = 'appointment' | 'product';

export type PaymentRequest = {
  id: string;
  customer_id: string;
  teacher_id: string;
  listing_id: string;
  listing_price_id: string;
  item_type: PaymentItemType;
  quantity: number;
  amount: number;
  bank_account_id: string | null;
  reference_code: string;
  status: PaymentRequestStatus;
  admin_note: string | null;
  confirmed_at: string | null;
  created_at: string;
  start_ts: string | null;
  end_ts: string | null;
  duration_minutes: number | null;
};

export type Order = {
  id: string;
  payment_request_id: string;
  customer_id: string;
  teacher_id: string;
  listing_id: string;
  quantity: number;
  total_amount: number;
  status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
};

export type EarningsLedgerEntry = {
  id: string;
  payment_request_id: string;
  teacher_id: string;
  source_type: 'appointment' | 'product';
  source_id: string;
  gross_amount: number;
  teacher_amount: number;
  platform_amount: number;
  payout_id: string | null;
  created_at: string;
};
