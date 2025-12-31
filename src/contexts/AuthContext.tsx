import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, UserRole } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type TeacherApplicationData = {
  dateOfBirth: string;
  specialization: string;
  education: string;
  yearsOfExperience: number;
  phone: string;
};

type AuthContextType = {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================
// HELPER FUNCTIONS - Separated for clarity
// =============================================

/**
 * Ensures a user has a profile in the profiles table
 * Creates one if missing, updates if exists
 */
async function ensureUserProfile(
  userId: string, 
  username: string, 
  isTeacherApproved: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username: username,
        is_teacher_approved: isTeacherApproved,
      },
      { onConflict: "id" }
    );
    
    if (error) {
      console.error("[AuthContext] Profile creation error:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err: any) {
    console.error("[AuthContext] Profile creation exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Assigns a role to user in user_roles table
 * Only inserts if role doesn't already exist
 */
async function ensureUserRole(
  userId: string, 
  role: UserRole
): Promise<{ success: boolean; error?: string; alreadyExists?: boolean }> {
  try {
    // Check existing role first
    const { data: existingRole, error: checkError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      console.error("[AuthContext] Role check error:", checkError);
      return { success: false, error: checkError.message };
    }

    // If role already exists, don't insert again
    if (existingRole) {
      console.log("[AuthContext] User already has role:", existingRole.role);
      return { success: true, alreadyExists: true };
    }

    // Insert new role
    const { error: insertError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: role,
    });

    if (insertError) {
      console.error("[AuthContext] Role insert error:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("[AuthContext] Role assigned successfully:", role, "for user:", userId);
    return { success: true };
  } catch (err: any) {
    console.error("[AuthContext] Role assignment exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Creates a teacher approval record for pending review
 */
async function createTeacherApproval(
  userId: string,
  fullName: string,
  teacherData: TeacherApplicationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("teacher_approvals").insert({
      user_id: userId,
      status: "pending",
      full_name: fullName,
      date_of_birth: teacherData.dateOfBirth,
      specialization: teacherData.specialization,
      education: teacherData.education,
      years_of_experience: teacherData.yearsOfExperience,
      phone: teacherData.phone,
    });

    if (error) {
      console.error("[AuthContext] Teacher approval creation error:", error);
      return { success: false, error: error.message };
    }

    console.log("[AuthContext] Teacher approval created for user:", userId);
    return { success: true };
  } catch (err: any) {
    console.error("[AuthContext] Teacher approval exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Checks teacher approval status and returns appropriate action
 */
async function checkTeacherApprovalStatus(
  userId: string
): Promise<{ status: "pending" | "approved" | "rejected" | "none"; shouldSignOut: boolean }> {
  try {
    const { data, error } = await supabase
      .from("teacher_approvals")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[AuthContext] Teacher approval check error:", error);
      return { status: "none", shouldSignOut: false };
    }

    if (!data) {
      return { status: "none", shouldSignOut: false };
    }

    const status = data.status as "pending" | "approved" | "rejected";
    const shouldSignOut = status === "pending" || status === "rejected";
    
    return { status, shouldSignOut };
  } catch (err) {
    console.error("[AuthContext] Teacher approval check exception:", err);
    return { status: "none", shouldSignOut: false };
  }
}

/**
 * Fetches user's role from database with priority handling
 * Priority: admin > teacher > customer
 */
async function fetchUserRoleFromDB(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("[AuthContext] Error fetching user role:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Priority: admin > teacher > customer
    const roles = data.map((d) => d.role as UserRole);
    if (roles.includes("admin")) return "admin";
    if (roles.includes("teacher")) return "teacher";
    if (roles.includes("customer")) return "customer";
    
    return roles[0] as UserRole;
  } catch (error) {
    console.error("[AuthContext] Error fetching user role:", error);
    return null;
  }
}

// =============================================
// AUTH PROVIDER COMPONENT
// =============================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Refs to track state without re-renders
  const hasInitializedRef = useRef(false);
  const wasSignedOutRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  /**
   * Handles post-login teacher approval checks
   * Unified function to avoid duplicate code
   */
  const handleTeacherApprovalCheck = useCallback(async (userId: string, accountType: string | undefined) => {
    if (accountType !== "teacher") {
      return { proceed: true };
    }

    const { status, shouldSignOut } = await checkTeacherApprovalStatus(userId);

    if (shouldSignOut) {
      await supabase.auth.signOut();
      
      const messages = {
        pending: {
          title: "Başvuru Onay Bekliyor",
          description: "Uzman başvurunuz inceleniyor. Onaylandıktan sonra giriş yapabileceksiniz.",
        },
        rejected: {
          title: "Başvuru Reddedildi",
          description: "Uzman başvurunuz reddedildi. Daha fazla bilgi için destek ile iletişime geçin.",
        },
      };

      const message = messages[status as "pending" | "rejected"];
      if (message) {
        toast({
          title: message.title,
          description: message.description,
          variant: status === "rejected" ? "destructive" : "default",
          duration: 6000,
        });
      }

      return { proceed: false };
    }

    return { proceed: true };
  }, [toast]);

  /**
   * Runs all post-signin checks and role fetching
   */
  const runPostSignInChecks = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      // Fetch role from database
      const userRole = await fetchUserRoleFromDB(userId);
      
      if (userRole) {
        setRole(userRole);
      } else {
        // No role found - check if teacher with pending approval
        const { status } = await checkTeacherApprovalStatus(userId);
        
        if (status === "pending" || status === "rejected") {
          // Will be signed out by approval check
          setRole(null);
        } else {
          // Default to customer if no role and no pending teacher approval
          setRole("customer");
          // Optionally assign customer role if completely missing
          await ensureUserRole(userId, "customer");
        }
      }
    } catch (err) {
      console.error("[AuthContext] Post sign-in checks error:", err);
      setRole("customer");
    } finally {
      setLoading(false);
    }
  }, []);

  // =============================================
  // AUTH STATE CHANGE LISTENER
  // =============================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthContext] onAuthStateChange:", event, "initialized:", hasInitializedRef.current);

      // After initial auth, be selective about events
      if (hasInitializedRef.current) {
        if (event === "SIGNED_OUT") {
          console.log("[AuthContext] User signed out");
          wasSignedOutRef.current = true;
          currentUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        // Only process SIGNED_IN if user explicitly signed out before
        if (event === "SIGNED_IN" && session?.user && wasSignedOutRef.current) {
          console.log("[AuthContext] New sign in after sign out");
          wasSignedOutRef.current = false;
          currentUserIdRef.current = session.user.id;
        } else {
          console.log("[AuthContext] Skipping event:", event);
          return;
        }
      }

      // Process session
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        hasInitializedRef.current = true;
        currentUserIdRef.current = session.user.id;
        const accountType = session.user.user_metadata?.account_type;

        // For teacher accounts, check approval status
        if (accountType === "teacher") {
          setLoading(true);
          setTimeout(async () => {
            const { proceed } = await handleTeacherApprovalCheck(session.user.id, accountType);
            if (proceed) {
              runPostSignInChecks(session.user.id);
            } else {
              setRole(null);
              setLoading(false);
            }
          }, 0);
          return;
        }

        // For other accounts, run normal checks
        setLoading(true);
        setTimeout(() => {
          runPostSignInChecks(session.user!.id);
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        hasInitializedRef.current = true;
        currentUserIdRef.current = session.user.id;
        runPostSignInChecks(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleTeacherApprovalCheck, runPostSignInChecks]);

  // =============================================
  // SIGN IN
  // =============================================
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Giriş Başarısız",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      if (data.user) {
        const accountType = data.user.user_metadata?.account_type;
        
        // Check teacher approval status
        const { proceed } = await handleTeacherApprovalCheck(data.user.id, accountType);
        
        if (!proceed) {
          return { error: new Error("Başvuru onay bekliyor veya reddedildi") };
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error("[AuthContext] Sign in error:", error);
      return { error };
    }
  };

  // =============================================
  // SIGN UP
  // =============================================
  const signUp = async (
    email: string,
    password: string,
    username: string,
    selectedRole: UserRole,
    teacherData?: TeacherApplicationData,
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
            account_type: selectedRole,
            ...(selectedRole === "teacher" && teacherData
              ? {
                  date_of_birth: teacherData.dateOfBirth,
                  specialization: teacherData.specialization,
                  education: teacherData.education,
                  years_of_experience: teacherData.yearsOfExperience,
                  phone: teacherData.phone,
                }
              : {}),
          },
        },
      });

      if (error) {
        console.error("[AuthContext] SignUp error:", error);
        toast({
          title: "Kayıt Başarısız",
          description: error.message || "Beklenmeyen bir hata oluştu",
          variant: "destructive",
        });
        return { error };
      }

      if (data.user) {
        console.log("[AuthContext] User created:", data.user.id, "Role:", selectedRole);

        // Step 1: Create profile
        const profileResult = await ensureUserProfile(data.user.id, username, false);
        if (!profileResult.success) {
          console.warn("[AuthContext] Profile creation failed:", profileResult.error);
        }

        // Step 2: Handle role-specific logic
        if (selectedRole === "customer") {
          // Assign customer role immediately
          const roleResult = await ensureUserRole(data.user.id, "customer");
          
          if (!roleResult.success) {
            console.error("[AuthContext] Customer role assignment failed:", roleResult.error);
            toast({
              title: "Uyarı",
              description: "Hesabınız oluşturuldu ancak rol atama işlemi başarısız oldu. Giriş yaptığınızda otomatik düzelecektir.",
              duration: 6000,
            });
          } else {
            console.log("[AuthContext] Customer role assigned successfully");
          }

          toast({
            title: "Hesabınız Oluşturuldu",
            description: "Artık giriş yapabilirsiniz.",
            duration: 5000,
          });

          return { error: null, isTeacher: false };
        } 
        
        if (selectedRole === "teacher" && teacherData) {
          // Create teacher approval record (pending status)
          const approvalResult = await createTeacherApproval(data.user.id, username, teacherData);
          
          if (!approvalResult.success) {
            console.error("[AuthContext] Teacher approval creation failed:", approvalResult.error);
            toast({
              title: "Başvuru Kaydedilemedi",
              description: "Hesabınız oluşturuldu ancak uzman başvurusu kaydedilemedi. Lütfen destek ile iletişime geçin.",
              variant: "destructive",
              duration: 8000,
            });
          }

          // Sign out teacher - they need to wait for approval
          await supabase.auth.signOut();
          return { error: null, isTeacher: true };
        }
      }

      return { error: null, isTeacher: false };
    } catch (error: any) {
      console.error("[AuthContext] SignUp exception:", error);
      return { error };
    }
  };

  // =============================================
  // SIGN OUT
  // =============================================
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    toast({
      title: "Çıkış Yapıldı",
      description: "Başarıyla çıkış yaptınız.",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
