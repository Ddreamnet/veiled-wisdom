import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';

type Teacher = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
};

export default function TeachersManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'teacher');

    if (!roles) return;

    const teacherIds = roles.map((r) => r.user_id);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('id', teacherIds)
      .eq('is_teacher_approved', true);

    if (data) setTeachers(data);
  };

  return (
    <div className="container py-12 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <h1 className="text-3xl font-bold">Hocaları Düzenle</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                <div className="w-full h-48 bg-primary/20 rounded-md mb-4" />
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
    </div>
  );
}
