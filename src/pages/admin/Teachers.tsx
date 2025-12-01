import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { useToast } from '@/hooks/use-toast';

type Teacher = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
};

export default function TeachersManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      const teacherIds = roles.map((r) => r.user_id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', teacherIds)
        .eq('is_teacher_approved', true);

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      toast({
        title: 'Hata',
        description: 'Hocalar yüklenemedi.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <h1 className="text-2xl md:text-3xl font-bold">Hocaları Düzenle</h1>
        <p className="text-muted-foreground">
          Onaylanmış hocaların profillerini görüntüle ve düzenle
        </p>
      </div>

      {teachers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-lg">
              Henüz onaylanmış hoca bulunmuyor.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Hoca başvurularını "Onaylamalar" sayfasından onaylayabilirsiniz.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {teachers.map((teacher) => (
            <Card key={teacher.id} className="hover:shadow-glow transition-smooth">
              <CardContent className="p-6">
                {teacher.avatar_url ? (
                  <img
                    src={teacher.avatar_url}
                    alt={teacher.username}
                    className="w-full h-48 object-cover rounded-md mb-4"
                  />
                ) : (
                  <div className="w-full h-48 bg-primary/20 rounded-md mb-4 flex items-center justify-center text-muted-foreground">
                    Fotoğraf Yok
                  </div>
                )}
                <h3 className="font-semibold text-lg mb-2">{teacher.username}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {teacher.bio || 'Biyografi eklenmemiş'}
                </p>
                <Link to={`/admin/teachers/${teacher.id}`}>
                  <Button size="sm" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Düzenle
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
