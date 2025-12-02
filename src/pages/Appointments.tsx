import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ArrowLeft, Home } from 'lucide-react';
import { ReviewDialog } from '@/components/ReviewDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAppointments } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';

export default function Appointments() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const { data, isLoading: dataLoading } = useAppointments(user?.id, role);
  const pending = data?.pending || [];
  const completed = data?.completed || [];
  const reviewedAppointments = data?.reviewedIds || new Set<string>();

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

      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
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

  const handleReviewSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  };

  const renderAppointment = (appointment: any, isCompletedTab = false) => {
    const isPending = appointment.status === 'pending';
    const isTeacher = role === 'teacher';
    const isCustomer = role === 'customer';
    const isLoading = loading === appointment.id;
    const hasReviewed = reviewedAppointments.has(appointment.id);

    return (
      <Card key={appointment.id} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-base md:text-lg">
            <span className="truncate">Randevu #{appointment.id.slice(0, 8)}</span>
            <Badge className="self-start sm:self-auto">{appointment.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium break-words">İlan: {appointment.listing?.title}</p>
            <p className="text-sm text-muted-foreground truncate">
              {isTeacher ? 'Öğrenci' : 'Öğretmen'}: {isTeacher ? appointment.customer?.username : appointment.teacher?.username}
            </p>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="break-words">Tarih: {new Date(appointment.start_ts).toLocaleString('tr-TR')}</p>
            <p>Süre: {appointment.duration_minutes} dakika</p>
            <p>Fiyat: {appointment.price_at_booking} TL</p>
          </div>
          
          {isTeacher && isPending && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(appointment, 'confirmed')}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Check className="w-4 h-4 mr-1" />
                Onayla
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusUpdate(appointment, 'cancelled')}
                disabled={isLoading}
                className="w-full sm:w-auto"
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
                onReviewSubmitted={handleReviewSubmitted}
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
    <div className="container px-4 md:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumb Navigation - Desktop only */}
      <div className="mb-4 hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Ana Sayfa
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Randevularım</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Back Button - Mobile only */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4 md:hidden"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Randevularım</h1>

      {dataLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="pending">Bekleyen ({pending.length})</TabsTrigger>
            <TabsTrigger value="completed">Tamamlanan ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-6">
            {pending.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                Bekleyen randevunuz bulunmuyor.
              </p>
            ) : (
              pending.map((apt: any) => renderAppointment(apt, false))
            )}
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            {completed.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                Tamamlanmış randevunuz bulunmuyor.
              </p>
            ) : (
              completed.map((apt: any) => renderAppointment(apt, true))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
