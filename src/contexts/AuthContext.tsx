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
  signUp: (email: string, password: string, username: string, role: UserRole, teacherData?: TeacherApplicationData) => Promise<{ error: any; isTeacher?: boolean }>;
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
    // Track if we already have a user to prevent unnecessary re-renders on token refresh
    let hasInitialized = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip TOKEN_REFRESHED events if user is already set - prevents tab switch re-renders
        if (event === 'TOKEN_REFRESHED' && hasInitialized) {
          setSession(session);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          hasInitialized = true;
          
          // Email onayından sonra teacher ise otomatik girişi engelle
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            const accountType = session.user.user_metadata?.account_type;
            
            if (accountType === 'teacher') {
              setTimeout(async () => {
                const { data: approvalData } = await supabase
                  .from('teacher_approvals')
                  .select('status')
                  .eq('user_id', session.user.id)
                  .maybeSingle();
                
                if (!approvalData) {
                  // Fallback: Kayıt yoksa otomatik pending başvuru oluştur
                  const md: any = session.user.user_metadata || {};
                  try {
                    await supabase.from('teacher_approvals').insert([
                      {
                        user_id: session.user.id,
                        status: 'pending',
                        full_name: md.username ?? null,
                        date_of_birth: md.date_of_birth ?? null,
                        specialization: md.specialization ?? null,
                        education: md.education ?? null,
                        years_of_experience: md.years_of_experience ?? null,
                        phone: md.phone ?? null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                    ]);
                  } catch (e) {
                    console.warn('teacher_approvals insert fallback failed:', e);
                  }

                  await supabase.auth.signOut();
                  toast({
                    title: "Başvuru Alındı",
                    description: "Hoca başvurunuz oluşturuldu ve inceleniyor. Onaylandıktan sonra giriş yapabileceksiniz.",
                    duration: 7000,
                  });
                  setRole(null);
                  setLoading(false);
                  return;
                }

                if (approvalData.status === 'pending') {
                  await supabase.auth.signOut();
                  toast({
                    title: "Başvuru Onay Bekliyor",
                    description: "Hoca başvurunuz inceleniyor. Onaylandıktan sonra giriş yapabileceksiniz.",
                    variant: "destructive",
                    duration: 6000,
                  });
                  setRole(null);
                  setLoading(false);
                  return;
                }
                
                if (approvalData.status === 'rejected') {
                  await supabase.auth.signOut();
                  toast({
                    title: "Başvuru Reddedildi",
                    description: "Hoca başvurunuz reddedildi. Daha fazla bilgi için destek ile iletişime geçin.",
                    variant: "destructive",
                    duration: 6000,
                  });
                  setRole(null);
                  setLoading(false);
                  return;
                }
                
                // Onaylı ise normal kontrol
                setLoading(true);
                runPostSignInChecks(session.user.id);
              }, 0);
              return;
            }
          }
          
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
        hasInitialized = true;
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
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      // Eğer hiç rol yoksa (teacher pending durumda olabilir)
      if (!data || data.length === 0) {
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

      // Birden fazla rol varsa öncelik sırasına göre seç: admin > teacher > customer
      const roles = data.map(d => d.role as UserRole);
      if (roles.includes('admin')) {
        setRole('admin');
      } else if (roles.includes('teacher')) {
        setRole('teacher');
      } else if (roles.includes('customer')) {
        setRole('customer');
      } else {
        setRole(roles[0] as UserRole);
      }
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

      // Mail onayı kaldırıldı - direkt devam et

      // Teacher başvurusu kontrolü - hem pending hem rejected durumları kontrol et
      if (data.user) {
        const { data: approvalData } = await supabase
          .from('teacher_approvals')
          .select('status')
          .eq('user_id', data.user.id)
          .maybeSingle();

        // Eğer user metadata'da teacher olarak kayıtlıysa ama approvalData yoksa, onay beklemeli
        const accountType = data.user.user_metadata?.account_type;
        
        if (accountType === 'teacher' && !approvalData) {
          // Fallback: Kayıt yoksa öğretmen başvurusunu otomatik oluştur
          const md: any = data.user.user_metadata || {};
          try {
            await supabase.from('teacher_approvals').insert([
              {
                user_id: data.user.id,
                status: 'pending',
                full_name: md.username ?? null,
                date_of_birth: md.date_of_birth ?? null,
                specialization: md.specialization ?? null,
                education: md.education ?? null,
                years_of_experience: md.years_of_experience ?? null,
                phone: md.phone ?? null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);
          } catch (e) {
            console.warn('teacher_approvals insert on signIn failed:', e);
          }

          await supabase.auth.signOut();
          const pendingError = new Error("Hoca başvurunuz oluşturuldu ve inceleniyor. Onaylandıktan sonra giriş yapabileceksiniz.");
          toast({
            title: "Başvuru Alındı",
            description: pendingError.message,
            duration: 7000,
          });
          return { error: pendingError };
        }

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

      // Kullanıcı oluşturulduysa profil ve rol oluştur
      if (data.user) {
        let hasError = false;

        // 1. Profil oluştur (kullanıcı kendi id'si için - RLS'e uygun)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username,
            is_teacher_approved: false,
          });

        if (profileError && profileError.code !== '23505') {
          console.error('Profile creation error:', profileError);
          toast({
            title: "Profil Oluşturulamadı",
            description: "Hesabınız oluşturuldu ancak profil kaydı başarısız oldu. Lütfen destek ile iletişime geçin.",
            variant: "destructive",
            duration: 8000,
          });
          hasError = true;
        }

        // 2. Rol ata (başlangıçta customer)
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'customer',
          });

        if (roleError && roleError.code !== '23505') {
          console.error('Role assignment error:', roleError);
          if (!hasError) {
            toast({
              title: "Rol Atanamadı",
              description: "Hesabınız oluşturuldu ancak rol ataması başarısız oldu. Lütfen destek ile iletişime geçin.",
              variant: "destructive",
              duration: 8000,
            });
          }
          hasError = true;
        }

        // 3. Hoca ise başvuru kaydı oluştur
        if (selectedRole === 'teacher' && teacherData) {
          const { error: approvalError } = await supabase
            .from('teacher_approvals')
            .insert({
              user_id: data.user.id,
              status: 'pending',
              full_name: username,
              date_of_birth: teacherData.dateOfBirth,
              specialization: teacherData.specialization,
              education: teacherData.education,
              years_of_experience: teacherData.yearsOfExperience,
              phone: teacherData.phone,
            });

          if (approvalError) {
            console.error('Teacher approval creation error:', approvalError);
            toast({
              title: "Başvuru Kaydedilemedi",
              description: "Hesabınız oluşturuldu ancak hoca başvurusu kaydedilemedi. Lütfen tekrar kayıt olmayı deneyin veya destek ile iletişime geçin.",
              variant: "destructive",
              duration: 8000,
            });
            hasError = true;
          }
        }

        // Kritik hatalar varsa ve işlem devam edemezse kullanıcıyı bilgilendir
        if (hasError && !profileError) {
          // Profil başarılı ama diğer işlemler başarısız - kullanıcı yine de devam edebilir
          console.warn('Kayıt tamamlandı ancak bazı işlemler başarısız oldu');
        }
      }

      if (selectedRole === 'teacher') {
        // Teacher kayıtlarında otomatik girişi engelle
        await supabase.auth.signOut();
        return { error: null, isTeacher: true };
      } else {
        toast({
          title: "Hesabınız Oluşturuldu",
          description: "Artık giriş yapabilirsiniz.",
          duration: 5000,
        });
      }

      return { error: null, isTeacher: false };
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
