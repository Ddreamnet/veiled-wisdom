import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReviewDialog } from '@/components/ReviewDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedBreadcrumb } from '@/components/UnifiedBreadcrumb';
import { useAppointments } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';

export default function Appointments() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading: dataLoading, isError, error } = useAppointments(user?.id, role);
  const pending = data?.pending || [];
  const completed = data?.completed || [];
  const reviewedAppointments = data?.reviewedIds || new Set<string>();

  const handleReviewSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  };

  const renderAppointment = (appointment: any, isCompletedTab = false) => {
    const isCustomer = role === 'customer';
    const hasReviewed = reviewedAppointments.has(appointment.id);

    return (
      <Card key={appointment.id} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-base md:text-lg">
            <span className="truncate">Randevu #{appointment.id.slice(0, 8)}</span>
            <Badge 
              className="self-start sm:self-auto"
              variant={
                appointment.status === 'confirmed' ? 'default' :
                appointment.status === 'cancelled' ? 'destructive' :
                appointment.status === 'completed' ? 'secondary' : 'outline'
              }
            >
              {
                appointment.status === 'cancelled' && role === 'customer'
                  ? 'Reddedildi'
                  : { pending: 'Ödeme Kontrol Ediliyor', confirmed: 'Onaylandı', cancelled: 'İptal Edildi', completed: 'Tamamlandı' }[appointment.status as string] || appointment.status
              }
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium break-words">İlan: {appointment.listing?.title}</p>
            <p className="text-sm text-muted-foreground truncate">
              {role === 'teacher' ? 'Danışan' : 'Uzman'}: {role === 'teacher' ? appointment.customer?.username : appointment.teacher?.username}
            </p>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="break-words">Tarih: {new Date(appointment.start_ts).toLocaleString('tr-TR')}</p>
            <p>Süre: {appointment.duration_minutes} dakika</p>
            <p>Fiyat: {appointment.price_at_booking} TL</p>
          </div>
          
          {/* Teacher approve/reject buttons removed — admin handles approval now */}

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

      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Randevularım</h1>

      {isError ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-destructive font-medium">Randevular yüklenirken bir hata oluştu.</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
        </div>
      ) : dataLoading ? (
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
