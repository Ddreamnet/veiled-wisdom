import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Calendar, CreditCard, Clock } from 'lucide-react';

type PayoutHistory = {
  id: string;
  appointment_count: number;
  amount: number;
  paid_at: string;
};

type EarningsSummary = {
  totalCompleted: number;
  totalEarnings: number;
  pendingCount: number;
  pendingAmount: number;
};

export default function TeacherEarnings() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EarningsSummary>({
    totalCompleted: 0,
    totalEarnings: 0,
    pendingCount: 0,
    pendingAmount: 0,
  });
  const [payouts, setPayouts] = useState<PayoutHistory[]>([]);

  useEffect(() => {
    if (user) {
      fetchEarnings();
      fetchPayouts();
    }
  }, [user]);

  const fetchEarnings = async () => {
    if (!user) return;

    // Get all completed appointments
    const { data: completed } = await supabase
      .from('appointments')
      .select('price_at_booking')
      .eq('teacher_id', user.id)
      .eq('status', 'completed');

    const totalCompleted = completed?.length || 0;
    const totalEarnings = completed?.reduce((sum, apt) => sum + Number(apt.price_at_booking), 0) || 0;

    // Get payouts to calculate pending
    const { data: payoutData } = await supabase
      .from('teacher_payouts')
      .select('appointment_count, amount')
      .eq('teacher_id', user.id);

    const paidCount = payoutData?.reduce((sum, p) => sum + p.appointment_count, 0) || 0;
    const paidAmount = payoutData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setSummary({
      totalCompleted,
      totalEarnings,
      pendingCount: totalCompleted - paidCount,
      pendingAmount: totalEarnings - paidAmount,
    });
  };

  const fetchPayouts = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('teacher_payouts')
      .select('*')
      .eq('teacher_id', user.id)
      .order('paid_at', { ascending: false });

    if (data) setPayouts(data);
  };

  return (
    <div className="container py-12 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Gelirlerim</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tamamlanan Randevular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalCompleted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Toplam Gelir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalEarnings.toFixed(2)} TL</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ödenecek Randevu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.pendingCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Ödenecek Miktar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.pendingAmount.toFixed(2)} TL</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ödeme Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Henüz ödeme geçmişiniz bulunmuyor.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ödenen Randevu Sayısı</TableHead>
                  <TableHead>Ödeme Miktarı</TableHead>
                  <TableHead>Ödeme Tarihi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{payout.appointment_count}</TableCell>
                    <TableCell>{Number(payout.amount).toFixed(2)} TL</TableCell>
                    <TableCell>
                      {new Date(payout.paid_at).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
