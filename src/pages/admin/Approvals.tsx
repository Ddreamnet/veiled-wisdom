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

type TeacherApproval = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
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
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'teacher' })
        .eq('user_id', userId);

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
    <div className="container py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Hoca Başvuruları</h1>

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
              <CardContent>
                <div className="flex gap-2">
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
