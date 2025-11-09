import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';
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

type TeacherEarning = {
  teacher_id: string;
  username: string;
  avatar_url: string | null;
  completed_count: number;
  total_earnings: number;
  pending_count: number;
  pending_amount: number;
  last_payout_date: string | null;
};

export default function AdminEarnings() {
  const [earnings, setEarnings] = useState<TeacherEarning[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    // Get all teachers
    const { data: teachers } = await supabase
      .from('user_roles')
      .select('user_id, profiles(username, avatar_url)')
      .eq('role', 'teacher');

    if (!teachers) return;

    const earningsData: TeacherEarning[] = [];

    for (const teacher of teachers) {
      // Get completed appointments
      const { data: completed } = await supabase
        .from('appointments')
        .select('price_at_booking')
        .eq('teacher_id', teacher.user_id)
        .eq('status', 'completed');

      const completedCount = completed?.length || 0;
      const totalEarnings = completed?.reduce((sum, apt) => sum + Number(apt.price_at_booking), 0) || 0;

      // Get pending appointments (completed but not paid)
      const { data: pending } = await supabase
        .from('appointments')
        .select('id, price_at_booking')
        .eq('teacher_id', teacher.user_id)
        .eq('status', 'completed')
        .not('id', 'in', `(SELECT unnest(string_to_array((SELECT string_agg(id::text, ',') FROM appointments WHERE teacher_id = '${teacher.user_id}' AND status = 'completed'), ',')))`);

      // Get last payout
      const { data: lastPayout } = await supabase
        .from('teacher_payouts')
        .select('paid_at')
        .eq('teacher_id', teacher.user_id)
        .order('paid_at', { ascending: false })
        .limit(1)
        .single();

      earningsData.push({
        teacher_id: teacher.user_id,
        username: (teacher.profiles as any)?.username || 'Bilinmeyen',
        avatar_url: (teacher.profiles as any)?.avatar_url || null,
        completed_count: completedCount,
        total_earnings: totalEarnings,
        pending_count: pending?.length || 0,
        pending_amount: pending?.reduce((sum, apt) => sum + Number(apt.price_at_booking), 0) || 0,
        last_payout_date: lastPayout?.paid_at || null,
      });
    }

    setEarnings(earningsData);
    
    // Calculate total platform revenue (commission)
    const total = earningsData.reduce((sum, e) => sum + e.total_earnings, 0);
    setTotalRevenue(total * 0.15); // 15% commission
  };

  const handlePayout = async (teacherId: string, amount: number, appointmentCount: number) => {
    const { error } = await supabase.from('teacher_payouts').insert({
      teacher_id: teacherId,
      appointment_count: appointmentCount,
      amount,
    });

    if (error) {
      toast({
        title: 'Hata',
        description: 'Ödeme kaydedilemedi.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Ödeme Yapıldı',
      description: `${amount} TL ödeme kaydedildi.`,
    });

    fetchEarnings();
  };

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold mb-8">Platform Gelirleri</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Toplam Platform Geliri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalRevenue.toFixed(2)} TL</p>
          <p className="text-sm text-muted-foreground mt-2">
            Tüm hocalardan alınan %15 komisyon
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hoca Ödemeleri</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hoca</TableHead>
                <TableHead>Tamamlanan</TableHead>
                <TableHead>Toplam Gelir</TableHead>
                <TableHead>Son Ödeme</TableHead>
                <TableHead>Ödenecek Adet</TableHead>
                <TableHead>Ödenecek Tutar</TableHead>
                <TableHead>İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings.map((earning) => (
                <TableRow key={earning.teacher_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {earning.avatar_url ? (
                        <img
                          src={earning.avatar_url}
                          alt={earning.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20" />
                      )}
                      <span>{earning.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>{earning.completed_count}</TableCell>
                  <TableCell>{earning.total_earnings.toFixed(2)} TL</TableCell>
                  <TableCell>
                    {earning.last_payout_date
                      ? new Date(earning.last_payout_date).toLocaleDateString('tr-TR')
                      : '-'}
                  </TableCell>
                  <TableCell>{earning.pending_count}</TableCell>
                  <TableCell>{earning.pending_amount.toFixed(2)} TL</TableCell>
                  <TableCell>
                    {earning.pending_amount > 0 ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm">Ödendi</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ödeme Onayla</AlertDialogTitle>
                            <AlertDialogDescription>
                              {earning.username} için {earning.pending_amount.toFixed(2)} TL
                              ödeme yapıldı olarak işaretlenecek.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handlePayout(
                                  earning.teacher_id,
                                  earning.pending_amount,
                                  earning.pending_count
                                )
                              }
                            >
                              Onayla
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-muted-foreground text-sm">Ödeme yok</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
