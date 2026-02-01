export type TeacherApproval = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  date_of_birth: string | null;
  specialization: string | null;
  education: string | null;
  years_of_experience: number | null;
  phone: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
    email?: string;
  };
  // Issue tracking
  hasProfileIssue?: boolean;
  hasRoleIssue?: boolean;
};

export type ApprovalsByStatus = {
  pending: TeacherApproval[];
  approved: TeacherApproval[];
  rejected: TeacherApproval[];
};
