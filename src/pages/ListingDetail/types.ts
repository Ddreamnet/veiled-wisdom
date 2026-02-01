import { Review, ConsultationType } from "@/lib/supabase";

export interface TeacherDetails {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  specialization?: string;
  education?: string;
  years_of_experience?: number;
}

export type ReviewWithProfile = Review & {
  customer: {
    username: string;
    avatar_url: string | null;
  };
};

export interface ListingData {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  teacher_id: string;
  consultation_type: ConsultationType;
  prices: Array<{
    id: string;
    duration_minutes: number;
    price: number;
  }>;
  teacher: TeacherDetails;
  reviews: ReviewWithProfile[];
  averageRating: number;
  category?: {
    name: string;
    slug: string;
    parent_id?: string | null;
  };
  parentCategory?: {
    name: string;
    slug: string;
  };
}
