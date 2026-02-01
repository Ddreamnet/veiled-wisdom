import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Expert {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

async function fetchApprovedExperts(limit?: number): Promise<Expert[]> {
  // Get all users with teacher role from user_roles table
  const { data: teacherRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "teacher");
    
  if (rolesError) throw rolesError;
  if (!teacherRoles || teacherRoles.length === 0) return [];
  
  const teacherIds = teacherRoles.map(r => r.user_id);
  
  // Fetch profiles for these teachers
  let query = supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .in("id", teacherIds);
  
  if (limit) {
    query = query.limit(limit);
  }
    
  const { data: profiles, error: profilesError } = await query;
    
  if (profilesError) throw profilesError;
  return profiles || [];
}

/**
 * Hook to fetch approved experts (teachers with profiles)
 * @param limit - Optional limit for homepage carousel (default: no limit)
 * @param queryKeyPrefix - Optional prefix for query key to differentiate caches
 */
export function useApprovedExperts(limit?: number, queryKeyPrefix: string = "experts") {
  return useQuery({
    queryKey: [queryKeyPrefix, limit],
    queryFn: () => fetchApprovedExperts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
