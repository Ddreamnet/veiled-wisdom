import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, UserRole } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  ensureUserProfile,
  ensureUserRole,
  fetchUserRoleFromDB,
  createTeacherApproval,
  checkTeacherApprovalStatus,
  type TeacherApplicationData,
  type AuthContextType,
} from "./auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      const userRole = await fetchUserRoleFromDB(userId);
      
      if (userRole) {
        setRole(userRole);
      } else {
        const { status } = await checkTeacherApprovalStatus(userId);
        
        if (status === "pending" || status === "rejected") {
          setRole(null);
        } else {
          setRole("customer");
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

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthContext] onAuthStateChange:", event, "initialized:", hasInitializedRef.current);

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

        if (event === "SIGNED_IN" && session?.user && wasSignedOutRef.current) {
          console.log("[AuthContext] New sign in after sign out");
          wasSignedOutRef.current = false;
          currentUserIdRef.current = session.user.id;
        } else {
          console.log("[AuthContext] Skipping event:", event);
          return;
        }
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        hasInitializedRef.current = true;
        currentUserIdRef.current = session.user.id;
        const accountType = session.user.user_metadata?.account_type;

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

        setLoading(true);
        setTimeout(() => {
          runPostSignInChecks(session.user!.id);
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

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

  // Sign in
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

  // Sign up
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

        const profileResult = await ensureUserProfile(data.user.id, username, false);
        if (!profileResult.success) {
          console.warn("[AuthContext] Profile creation failed:", profileResult.error);
        }

        if (selectedRole === "customer") {
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

  // Sign out
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
