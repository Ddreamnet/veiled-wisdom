import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserRole } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
  signUp: (email: string, password: string, username: string, role: UserRole, teacherData?: TeacherApplicationData) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Bloklamayı önlemek için hemen loading'i true yapıyoruz; yönlendirme yapılmasın
          setLoading(true);
          setTimeout(() => {
            runPostSignInChecks(session.user!.id);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        runPostSignInChecks(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const runPostSignInChecks = async (userId: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUserRole(userId),
        checkTeacherApproval(userId),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      // Eğer hiç rol yoksa (teacher pending durumda olabilir)
      if (!data) {
        // Teacher approval kontrolü yap
        const { data: approvalData } = await supabase
          .from('teacher_approvals')
          .select('status')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (approvalData?.status === 'pending') {
          setRole('customer'); // Geçici olarak customer göster, checkTeacherApproval zaten signOut yapacak
          return;
        }
        
        // Varsayılan olarak customer
        setRole('customer');
        return;
      }

      setRole(data.role as UserRole);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('customer');
    }
  };

  const checkTeacherApproval = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_approvals')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking teacher approval:', error);
        return;
      }

      if (data?.status === 'pending') {
        await supabase.auth.signOut();
        toast({
          title: "Başvuru Onay Bekliyor",
          description: "Hoca başvurunuz inceleniyor. Onaylandıktan sonra giriş yapabileceksiniz.",
          variant: "destructive",
          duration: 6000,
        });
      } else if (data?.status === 'rejected') {
        await supabase.auth.signOut();
        toast({
          title: "Başvuru Reddedildi",
          description: "Hoca başvurunuz reddedildi. Daha fazla bilgi için destek ile iletişime geçin.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (e) {
      console.error('Error checking teacher approval:', e);
    }
  };

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

      // E-posta onayı kontrolü
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        const confirmError = new Error("Lütfen e-posta adresinize gönderilen linke tıklayarak hesabınızı onaylayın.");
        toast({
          title: "E-posta Onayı Gerekli",
          description: confirmError.message,
          variant: "destructive",
        });
        return { error: confirmError };
      }

      // Teacher başvurusu kontrolü - hem pending hem rejected durumları kontrol et
      if (data.user) {
        const { data: approvalData } = await supabase
          .from('teacher_approvals')
          .select('status')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (approvalData) {
          if (approvalData.status === 'pending') {
            await supabase.auth.signOut();
            const pendingError = new Error("Hoca başvurunuz inceleniyor. Onaylandıktan sonra giriş yapabileceksiniz.");
            toast({
              title: "Başvuru Onay Bekliyor",
              description: pendingError.message,
              variant: "destructive",
              duration: 6000,
            });
            return { error: pendingError };
          }
          
          if (approvalData.status === 'rejected') {
            await supabase.auth.signOut();
            const rejectedError = new Error("Hoca başvurunuz reddedildi. Daha fazla bilgi için destek ile iletişime geçin.");
            toast({
              title: "Başvuru Reddedildi",
              description: rejectedError.message,
              variant: "destructive",
              duration: 6000,
            });
            return { error: rejectedError };
          }
        }
      }
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, username: string, selectedRole: UserRole, teacherData?: TeacherApplicationData) => {
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
            ...(selectedRole === 'teacher' && teacherData
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
        console.error('Supabase signUp error:', error);
        toast({
          title: "Kayıt Başarısız",
          description: error.message || 'Beklenmeyen bir hata oluştu',
          variant: "destructive",
        });
        return { error };
      }

      if (data.user) {
        // Profil, rol ve (öğretmen ise) başvuru kaydı backend tetikleyicisi ile oluşturulacak
        if (selectedRole === 'teacher') {
          await supabase.auth.signOut();
          toast({
            title: "Başvuru Alındı",
            description: "E-posta adresinize gönderilen linke tıklayarak hesabınızı onaylayın. Başvurunuz admin onayına iletildi.",
            duration: 7000,
          });
        } else {
          toast({
            title: "Kayıt Başarılı",
            description: "E-posta adresinize gönderilen linke tıklayarak hesabınızı onaylayın.",
            duration: 5000,
          });
        }
      }

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
