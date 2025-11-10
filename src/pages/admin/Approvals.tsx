import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';

type TeacherApproval = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  date_of_birth: string | null;
  specialization: string | null;
  education: string | null;
  years_of_experience: number | null;
  phone: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

export default function Approvals() {
  const [approvals, setApprovals] = useState<TeacherApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    const { data } = await supabase
      .from('teacher_approvals')
      .select('*, profiles(username, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (data) setApprovals(data as any);
  };

  const handleApproval = async (approvalId: string, userId: string, approve: boolean) => {
    setLoading(true);

    // Update approval status
    const { error: approvalError } = await supabase
      .from('teacher_approvals')
      .update({
        status: approve ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', approvalId);

    if (approvalError) {
      toast({
        title: 'Hata',
        description: 'İşlem başarısız oldu.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (approve) {
      // Update user role to teacher
      const { data: updatedRole, error: roleUpdateError } = await supabase
        .from('user_roles')
        .update({ role: 'teacher' })
        .eq('user_id', userId)
        .select();

      let roleError = roleUpdateError as any;
      if (!roleUpdateError && (!updatedRole || updatedRole.length === 0)) {
        const { error: roleInsertError } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: 'teacher' }]);
        roleError = roleInsertError;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_teacher_approved: true })
        .eq('id', userId);

      if (roleError || profileError) {
        toast({
          title: 'Hata',
          description: 'Rol güncellenemedi.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    toast({
      title: approve ? 'Onaylandı' : 'Reddedildi',
      description: approve
        ? 'Hoca başvurusu onaylandı.'
        : 'Hoca başvurusu reddedildi.',
    });

    fetchApprovals();
    setLoading(false);
  };

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <h1 className="text-2xl md:text-3xl font-bold">Hoca Başvuruları</h1>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Bekleyen başvuru bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {approval.profiles.avatar_url ? (
                      <img
                        src={approval.profiles.avatar_url}
                        alt={approval.profiles.username}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20" />
                    )}
                    <div>
                      <CardTitle>{approval.profiles.username}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(approval.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  <Badge>{approval.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm">
                  {approval.date_of_birth && (
                    <div>
                      <span className="font-medium">Doğum Tarihi:</span>{' '}
                      <span className="text-muted-foreground">
                        {new Date(approval.date_of_birth).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  )}
                  {approval.phone && (
                    <div>
                      <span className="font-medium">Telefon:</span>{' '}
                      <span className="text-muted-foreground">{approval.phone}</span>
                    </div>
                  )}
                  {approval.specialization && (
                    <div>
                      <span className="font-medium">Uzmanlık Alanı:</span>{' '}
                      <span className="text-muted-foreground">{approval.specialization}</span>
                    </div>
                  )}
                  {approval.education && (
                    <div>
                      <span className="font-medium">Eğitim:</span>{' '}
                      <span className="text-muted-foreground">{approval.education}</span>
                    </div>
                  )}
                  {approval.years_of_experience !== null && (
                    <div>
                      <span className="font-medium">Deneyim:</span>{' '}
                      <span className="text-muted-foreground">{approval.years_of_experience} yıl</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" disabled={loading}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Onayla
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Başvuruyu Onayla</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bu kullanıcıyı hoca olarak onaylamak istediğinize emin misiniz?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleApproval(approval.id, approval.user_id, true)}
                        >
                          Onayla
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={loading}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reddet
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Başvuruyu Reddet</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bu başvuruyu reddetmek istediğinize emin misiniz?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleApproval(approval.id, approval.user_id, false)}
                        >
                          Reddet
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
