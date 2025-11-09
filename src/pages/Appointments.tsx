import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Appointment } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Appointments() {
  const { user, role } = useAuth();
  const [pending, setPending] = useState<Appointment[]>([]);
  const [completed, setCompleted] = useState<Appointment[]>([]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, role]);

  const fetchAppointments = async () => {
    if (!user) return;

    const column = role === 'teacher' ? 'teacher_id' : 'customer_id';
    const now = new Date().toISOString();

    const { data: pendingData } = await supabase
      .from('appointments')
      .select('*')
      .eq(column, user.id)
      .gte('start_ts', now)
      .order('start_ts', { ascending: true });

    const { data: completedData } = await supabase
      .from('appointments')
      .select('*')
      .eq(column, user.id)
      .lt('start_ts', now)
      .order('start_ts', { ascending: false });

    if (pendingData) setPending(pendingData);
    if (completedData) setCompleted(completedData);
  };

  const renderAppointment = (appointment: Appointment) => (
    <Card key={appointment.id} className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Randevu #{appointment.id.slice(0, 8)}</span>
          <Badge>{appointment.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Tarih: {new Date(appointment.start_ts).toLocaleString('tr-TR')}
        </p>
        <p className="text-sm text-muted-foreground">
          Süre: {appointment.duration_minutes} dakika
        </p>
        <p className="text-sm text-muted-foreground">
          Fiyat: {appointment.price_at_booking} TL
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Randevularım</h1>
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Bekleyen ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Tamamlanan ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-6">
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Bekleyen randevunuz bulunmuyor.
            </p>
          ) : (
            pending.map(renderAppointment)
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {completed.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Tamamlanmış randevunuz bulunmuyor.
            </p>
          ) : (
            completed.map(renderAppointment)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
