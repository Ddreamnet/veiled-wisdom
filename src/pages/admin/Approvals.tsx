import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Mail, Phone, GraduationCap, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  reviewed_at: string | null;
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
};

export default function Approvals() {
  const [pendingApprovals, setPendingApprovals] = useState<TeacherApproval[]>([]);
  const [approvedApprovals, setApprovedApprovals] = useState<TeacherApproval[]>([]);
  const [rejectedApprovals, setRejectedApprovals] = useState<TeacherApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovals();

    // Real-time subscription for new applications
    const channel = supabase
      .channel('teacher-approvals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_approvals',
        },
        () => {
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApprovals = async () => {
    const loadByStatus = async (status: 'pending' | 'approved' | 'rejected') => {
      const orderBy = status === 'pending' ? { column: 'created_at', asc: true } : { column: 'reviewed_at', asc: false };

      const { data, error } = await supabase
        .from('teacher_approvals')
        .select('*')
        .eq('status', status)
        .order(orderBy.column as any, { ascending: orderBy.asc });

      if (error) {
        console.error('teacher_approvals fetch error:', error);
        return [] as TeacherApproval[];
      }

      const userIds = (data || []).map((d: any) => d.user_id).filter(Boolean);

      // Fetch related profiles in one query without relying on PostgREST FK joins
      let profilesMap = new Map<string, { id: string; username: string; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('profiles fetch error:', profilesError);
        } else {
          profilesData?.forEach((p: any) => profilesMap.set(p.id, p));
        }
      }

      const enriched: TeacherApproval[] = (data || []).map((d: any) => {
        const p = profilesMap.get(d.user_id);
        return {
          ...d,
          profiles: {
            username: p?.username || 'Kullanıcı',
            avatar_url: p?.avatar_url || null,
          },
        } as TeacherApproval;
      });

      return enriched;
    };

    const [pending, approved, rejected] = await Promise.all([
      loadByStatus('pending'),
      loadByStatus('approved'),
      loadByStatus('rejected'),
    ]);

    setPendingApprovals(pending);
    setApprovedApprovals(approved);
    setRejectedApprovals(rejected);
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

  const renderApprovalCard = (approval: TeacherApproval, showActions: boolean = false) => (
    <Card key={approval.id}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {approval.profiles.avatar_url ? (
              <img
                src={approval.profiles.avatar_url}
                alt={approval.profiles.username}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {approval.profiles.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <CardTitle>{approval.profiles.username}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                {new Date(approval.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <Badge
            variant={
              approval.status === 'approved'
                ? 'default'
                : approval.status === 'rejected'
                ? 'destructive'
                : 'secondary'
            }
          >
            {approval.status === 'pending'
              ? 'Bekliyor'
              : approval.status === 'approved'
              ? 'Onaylandı'
              : 'Reddedildi'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm">
          {approval.profiles.email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">E-posta:</span>{' '}
                <span className="text-muted-foreground">{approval.profiles.email}</span>
              </div>
            </div>
          )}
          {approval.phone && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Telefon:</span>{' '}
                <span className="text-muted-foreground">{approval.phone}</span>
              </div>
            </div>
          )}
          {approval.date_of_birth && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Doğum Tarihi:</span>{' '}
                <span className="text-muted-foreground">
                  {new Date(approval.date_of_birth).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          )}
          {approval.specialization && (
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Uzmanlık Alanı:</span>{' '}
                <span className="text-muted-foreground">{approval.specialization}</span>
              </div>
            </div>
          )}
          {approval.education && (
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Eğitim:</span>{' '}
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {approval.education}
                </span>
              </div>
            </div>
          )}
          {approval.years_of_experience !== null && (
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Deneyim:</span>{' '}
                <span className="text-muted-foreground">{approval.years_of_experience} yıl</span>
              </div>
            </div>
          )}
          {approval.reviewed_at && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">İncelenme Tarihi:</span>{' '}
                <span className="text-muted-foreground">
                  {new Date(approval.reviewed_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {showActions && (
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
                    <strong>{approval.profiles.username}</strong> kullanıcısını hoca olarak
                    onaylamak istediğinize emin misiniz? Onaylandıktan sonra giriş yapabilecek.
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
                    <strong>{approval.profiles.username}</strong> kullanıcısının başvurusunu
                    reddetmek istediğinize emin misiniz?
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
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Hoca Başvuruları</h1>
          <Badge variant="secondary" className="text-base px-3 py-1">
            {pendingApprovals.length} Bekliyor
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pending">
            Bekleyen ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Onaylanan ({approvedApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Reddedilen ({rejectedApprovals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Bekleyen başvuru bulunmuyor.</p>
              </CardContent>
            </Card>
          ) : (
            pendingApprovals.map((approval) => renderApprovalCard(approval, true))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-6">
          {approvedApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Onaylanmış başvuru bulunmuyor.</p>
              </CardContent>
            </Card>
          ) : (
            approvedApprovals.map((approval) => renderApprovalCard(approval, false))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-6">
          {rejectedApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Reddedilmiş başvuru bulunmuyor.</p>
              </CardContent>
            </Card>
          ) : (
            rejectedApprovals.map((approval) => renderApprovalCard(approval, false))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
