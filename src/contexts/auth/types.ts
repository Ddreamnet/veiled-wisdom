import { User, Session } from "@supabase/supabase-js";
import { UserRole } from "@/lib/supabase";

export type TeacherApplicationData = {
  dateOfBirth: string;
  specialization: string;
  education: string;
  yearsOfExperience: number;
  phone: string;
};

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    role: UserRole,
    teacherData?: TeacherApplicationData,
  ) => Promise<{ error: any; isTeacher?: boolean }>;
  signOut: () => Promise<void>;
};
