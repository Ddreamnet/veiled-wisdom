import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Appointment } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';
import { ReviewDialog } from '@/components/ReviewDialog';

export default function Appointments() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<Appointment[]>([]);
  const [completed, setCompleted] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [reviewedAppointments, setReviewedAppointments] = useState<Set<string>>(new Set());

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
      .select(`
        *,
        listing:listings(title, id),
        customer:profiles!appointments_customer_id_fkey(username),
        teacher:profiles!appointments_teacher_id_fkey(username)
      `)
      .eq(column, user.id)
      .gte('start_ts', now)
      .order('start_ts', { ascending: true });

    const { data: completedData } = await supabase
      .from('appointments')
      .select(`
        *,
        listing:listings(title, id),
        customer:profiles!appointments_customer_id_fkey(username),
        teacher:profiles!appointments_teacher_id_fkey(username)
      `)
      .eq(column, user.id)
      .lt('start_ts', now)
      .order('start_ts', { ascending: false });

    if (pendingData) setPending(pendingData as any);
    if (completedData) {
      setCompleted(completedData as any);
      
      // Check which appointments have been reviewed
      if (role === 'customer') {
        const appointmentIds = completedData.map((a: any) => a.id);
        const { data: reviews } = await supabase
          .from('reviews')
          .select('id')
          .in('listing_id', completedData.map((a: any) => a.listing?.id).filter(Boolean))
          .eq('customer_id', user.id);
        
        if (reviews) {
          const reviewedListings = new Set(
            completedData
              .filter((a: any) => 
                reviews.some((r: any) => 
                  completedData.find((ap: any) => ap.listing?.id === a.listing?.id && ap.customer_id === user.id)
                )
              )
              .map((a: any) => a.id)
          );
          setReviewedAppointments(reviewedListings);
        }
      }
    }
  };

  const handleStatusUpdate = async (appointment: any, newStatus: 'confirmed' | 'cancelled') => {
    setLoading(appointment.id);

    try {
      // Update appointment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointment.id);

      if (updateError) throw updateError;

      // Send email notification
      await supabase.functions.invoke('send-status-update-email', {
        body: {
          customerUserId: appointment.customer_id,
          customerName: appointment.customer?.username || 'Kullanıcı',
          teacherName: appointment.teacher?.username || 'Öğretmen',
          listingTitle: appointment.listing?.title || 'İlan',
          startTime: appointment.start_ts,
          duration: appointment.duration_minutes,
          price: appointment.price_at_booking,
          status: newStatus,
        },
      });

      toast({
        title: newStatus === 'confirmed' ? 'Randevu Onaylandı' : 'Randevu İptal Edildi',
        description: 'Kullanıcıya email bildirimi gönderildi.',
      });

      // Refresh appointments
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const renderAppointment = (appointment: any, isCompletedTab = false) => {
    const isPending = appointment.status === 'pending';
    const isTeacher = role === 'teacher';
    const isCustomer = role === 'customer';
    const isLoading = loading === appointment.id;
    const hasReviewed = reviewedAppointments.has(appointment.id);

    return (
      <Card key={appointment.id} className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Randevu #{appointment.id.slice(0, 8)}</span>
            <Badge>{appointment.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">İlan: {appointment.listing?.title}</p>
            <p className="text-sm text-muted-foreground">
              {isTeacher ? 'Öğrenci' : 'Öğretmen'}: {isTeacher ? appointment.customer?.username : appointment.teacher?.username}
            </p>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Tarih: {new Date(appointment.start_ts).toLocaleString('tr-TR')}</p>
            <p>Süre: {appointment.duration_minutes} dakika</p>
            <p>Fiyat: {appointment.price_at_booking} TL</p>
          </div>
          
          {isTeacher && isPending && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(appointment, 'confirmed')}
                disabled={isLoading}
              >
                <Check className="w-4 h-4 mr-1" />
                Onayla
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusUpdate(appointment, 'cancelled')}
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-1" />
                Reddet
              </Button>
            </div>
          )}

          {isCustomer && isCompletedTab && appointment.listing?.id && !hasReviewed && (
            <div className="pt-2">
              <ReviewDialog
                appointmentId={appointment.id}
                listingId={appointment.listing.id}
                customerId={user!.id}
                onReviewSubmitted={fetchAppointments}
              />
            </div>
          )}

          {isCustomer && isCompletedTab && hasReviewed && (
            <p className="text-xs text-muted-foreground pt-2">
              ✓ Değerlendirme yapıldı
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container py-12">
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
            pending.map((apt) => renderAppointment(apt, false))
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {completed.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Tamamlanmış randevunuz bulunmuyor.
            </p>
          ) : (
            completed.map((apt) => renderAppointment(apt, true))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
