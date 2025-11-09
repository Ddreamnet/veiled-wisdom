import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Listing, ListingPrice } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Calendar, Clock, DollarSign } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
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

type ListingWithDetails = Listing & {
  prices: ListingPrice[];
  teacher: {
    username: string;
    avatar_url: string | null;
    bio: string | null;
  };
};

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listing, setListing] = useState<ListingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    setLoading(true);

    const { data: listingData } = await supabase
      .from('listings')
      .select('*, teacher:profiles!teacher_id(*)')
      .eq('id', id)
      .single();

    if (listingData) {
      const { data: prices } = await supabase
        .from('listing_prices')
        .select('*')
        .eq('listing_id', id)
        .order('duration_minutes');

      setListing({
        ...listingData,
        prices: prices || [],
        teacher: (listingData as any).teacher,
      } as any);
    }

    setLoading(false);
  };

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: 'Giriş Gerekli',
        description: 'Randevu almak için giriş yapmalısınız.',
        variant: 'destructive',
      });
      navigate('/auth/sign-in');
      return;
    }

    if (!selectedDuration || !selectedDate || !selectedTime) {
      toast({
        title: 'Eksik Bilgi',
        description: 'Lütfen seans süresi, tarih ve saat seçin.',
        variant: 'destructive',
      });
      return;
    }

    setBookingLoading(true);

    const selectedPrice = listing?.prices.find(
      (p) => p.duration_minutes === selectedDuration
    );

    if (!selectedPrice || !listing) {
      setBookingLoading(false);
      return;
    }

    const startTs = new Date(`${selectedDate}T${selectedTime}`);
    const endTs = new Date(startTs.getTime() + selectedDuration * 60000);

    const { error } = await supabase.from('appointments').insert({
      listing_id: listing.id,
      customer_id: user.id,
      teacher_id: listing.teacher_id,
      status: 'pending',
      start_ts: startTs.toISOString(),
      end_ts: endTs.toISOString(),
      duration_minutes: selectedDuration,
      price_at_booking: selectedPrice.price,
    });

    if (error) {
      toast({
        title: 'Hata',
        description: 'Randevu oluşturulamadı.',
        variant: 'destructive',
      });
      setBookingLoading(false);
      return;
    }

    // Get user profiles for email
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', listing.teacher_id)
      .maybeSingle();

    // Send email notifications
    try {
      await supabase.functions.invoke('send-appointment-email', {
        body: {
          customerUserId: user.id,
          customerName: customerProfile?.username || 'Kullanıcı',
          teacherUserId: listing.teacher_id,
          teacherName: teacherProfile?.username || listing.teacher.username,
          listingTitle: listing.title,
          startTime: startTs.toISOString(),
          duration: selectedDuration,
          price: selectedPrice.price,
        },
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't block the booking if email fails
    }

    toast({
      title: 'Randevu Oluşturuldu',
      description: 'Randevunuz başarıyla oluşturuldu. Email bildirimleri gönderildi.',
    });

    navigate('/appointments');
    setBookingLoading(false);
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-96 w-full mb-8" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div>
            <Skeleton className="h-64 w-full mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container py-12">
        <p className="text-center text-muted-foreground">İlan bulunamadı.</p>
      </div>
    );
  }

  const selectedPrice = listing.prices.find(
    (p) => p.duration_minutes === selectedDuration
  );

  return (
    <div className="container py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-bold mb-6">{listing.title}</h1>

          {listing.cover_url && (
            <img
              src={listing.cover_url}
              alt={listing.title}
              className="w-full h-96 object-cover rounded-lg mb-8 shadow-elegant"
            />
          )}

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>İlan Açıklaması</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yorumlar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Henüz yorum bulunmuyor.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Randevu Talep Et</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Randevu oluşturmadan önce hocayla tarih ve saati konuşmalısınız.
                </p>
              </div>

              <Link to="/messages">
                <Button className="w-full" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mesaj Gönder
                </Button>
              </Link>

              <div className="border-t pt-6">
                <Label className="text-base mb-4 block">Seans Süresi</Label>
                <RadioGroup
                  value={selectedDuration?.toString()}
                  onValueChange={(v) => setSelectedDuration(parseInt(v))}
                >
                  {listing.prices.map((price) => (
                    <div
                      key={price.duration_minutes}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={price.duration_minutes.toString()}
                          id={`duration-${price.duration_minutes}`}
                        />
                        <Label
                          htmlFor={`duration-${price.duration_minutes}`}
                          className="cursor-pointer"
                        >
                          <Clock className="h-4 w-4 inline mr-2" />
                          {price.duration_minutes} dakika
                        </Label>
                      </div>
                      <span className="font-semibold">{price.price} TL</span>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="date" className="text-base mb-2 block">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Tarih
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="time" className="text-base mb-2 block">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Saat
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>

              {selectedPrice && (
                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Toplam:</span>
                    <span className="flex items-center">
                      <DollarSign className="h-5 w-5" />
                      {selectedPrice.price} TL
                    </span>
                  </div>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={
                      !selectedDuration || !selectedDate || !selectedTime || bookingLoading
                    }
                  >
                    Ödemeye Geç
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Randevu Onayı</AlertDialogTitle>
                    <AlertDialogDescription>
                      Randevunuzu onaylamak istediğinize emin misiniz?
                      <br />
                      <br />
                      <strong>Tarih:</strong> {selectedDate}
                      <br />
                      <strong>Saat:</strong> {selectedTime}
                      <br />
                      <strong>Süre:</strong> {selectedDuration} dakika
                      <br />
                      <strong>Tutar:</strong> {selectedPrice?.price} TL
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBooking}>
                      Onayla ve Ödemeye Geç
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {listing.teacher.avatar_url ? (
                  <img
                    src={listing.teacher.avatar_url}
                    alt={listing.teacher.username}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {listing.teacher.username}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {listing.teacher.bio || 'Biyografi eklenmemiş'}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    ⭐ Henüz yorum yok
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
