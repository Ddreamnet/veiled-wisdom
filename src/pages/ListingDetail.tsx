import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Listing, ListingPrice, Review, Category } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Calendar as CalendarIcon, Clock, DollarSign, Star, Home, ChevronRight } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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

type TeacherDetails = {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  specialization?: string;
  education?: string;
  years_of_experience?: number;
};

type ReviewWithProfile = Review & {
  customer: {
    username: string;
    avatar_url: string | null;
  };
};

type ListingWithDetails = Listing & {
  prices: ListingPrice[];
  teacher: TeacherDetails;
  reviews: ReviewWithProfile[];
  averageRating: number;
  category?: Category;
  parentCategory?: Category;
};

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listing, setListing] = useState<ListingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    setLoading(true);

    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (listingError) {
      console.error('Listing fetch error:', listingError);
      setLoading(false);
      return;
    }

    if (!listingData) {
      setLoading(false);
      return;
    }

    // Fetch teacher profile separately
    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', listingData.teacher_id)
      .maybeSingle();

    const { data: prices } = await supabase
      .from('listing_prices')
      .select('*')
      .eq('listing_id', id)
      .order('duration_minutes');

    // Fetch category
    const { data: categoryData } = await supabase
      .from('categories')
      .select('*')
      .eq('id', listingData.category_id)
      .maybeSingle();

    // Fetch parent category if exists
    let parentCategoryData = null;
    if (categoryData?.parent_id) {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryData.parent_id)
        .maybeSingle();
      parentCategoryData = data;
    }

    // Fetch teacher additional details from approved applications
    const { data: teacherApproval } = await supabase
      .from('teacher_approvals')
      .select('specialization, education, years_of_experience')
      .eq('user_id', listingData.teacher_id)
      .eq('status', 'approved')
      .maybeSingle();

    const teacherDetails: TeacherDetails = {
      username: teacherProfile?.username || 'Unknown',
      avatar_url: teacherProfile?.avatar_url || null,
      bio: teacherProfile?.bio || null,
      specialization: teacherApproval?.specialization,
      education: teacherApproval?.education,
      years_of_experience: teacherApproval?.years_of_experience,
    };

    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, customer:profiles!reviews_customer_id_fkey(username, avatar_url)')
      .eq('listing_id', id)
      .order('created_at', { ascending: false });

    const reviewsList = (reviewsData || []) as ReviewWithProfile[];
    setReviews(reviewsList);
    
    // Calculate average rating
    if (reviewsList.length > 0) {
      const avg = reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length;
      setAverageRating(Math.round(avg * 10) / 10);
    }

    setListing({
      ...listingData,
      prices: prices || [],
      teacher: teacherDetails,
      reviews: reviewsList,
      averageRating: reviewsList.length > 0 
        ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length 
        : 0,
      category: categoryData || undefined,
      parentCategory: parentCategoryData || undefined,
    } as any);

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

    const startTs = selectedDate ? new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`) : new Date();
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
      <div className="container py-8 md:py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-8 md:h-10 lg:h-12 w-3/4 mb-4" />
            <Skeleton className="h-64 md:h-80 lg:h-96 w-full mb-6 md:mb-8" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div>
            <Skeleton className="h-48 md:h-64 w-full mb-4" />
            <Skeleton className="h-40 md:h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container py-8 md:py-12 px-4">
        <p className="text-center text-sm md:text-base text-muted-foreground">İlan bulunamadı.</p>
      </div>
    );
  }

  const selectedPrice = listing.prices.find(
    (p) => p.duration_minutes === selectedDuration
  );

  return (
    <div className="container py-8 md:py-12 px-4">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Ana Sayfa
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          {listing.parentCategory && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/categories/${listing.parentCategory.slug}`}>
                    {listing.parentCategory.name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
            </>
          )}
          {listing.category && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={listing.parentCategory 
                    ? `/categories/${listing.parentCategory.slug}/${listing.category.slug}` 
                    : `/categories/${listing.category.slug}`}>
                    {listing.category.name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{listing.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
        {/* Görsel - Mobilde 1. sırada */}
        <div className="order-1 lg:order-none lg:col-span-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">{listing.title}</h1>

          {listing.cover_url && (
            <div className="relative group overflow-hidden rounded-xl shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img
                src={listing.cover_url}
                alt={listing.title}
                loading="lazy"
                decoding="async"
                className="w-full h-64 sm:h-80 md:h-96 lg:h-[28rem] object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          )}
        </div>

        {/* İlan Açıklaması - Mobilde 2. sırada */}
        <Card className="order-2 lg:order-none border-2 shadow-md lg:sticky lg:top-6">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <div className="h-1 w-8 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
              İlan Açıklaması
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            <p className="text-sm md:text-base text-foreground leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </CardContent>
        </Card>

        {/* Hoca Hakkında - Mobilde 3. sırada */}
        <Card className="order-3 lg:order-none border-2 shadow-md">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Hoca Hakkında
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-5 p-5 md:p-6">
            <div className="flex items-start gap-3 md:gap-4 pb-3 md:pb-4 border-b">
              {listing.teacher.avatar_url ? (
                <img
                  src={listing.teacher.avatar_url}
                  alt={listing.teacher.username}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl md:text-2xl text-primary">
                    {listing.teacher.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base md:text-lg mb-1 truncate">
                  {listing.teacher.username}
                </h3>
                {reviews.length > 0 ? (
                  <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                    <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-xs md:text-sm">({reviews.length} değerlendirme)</span>
                  </div>
                ) : (
                  <div className="text-xs md:text-sm text-muted-foreground">
                    Henüz değerlendirme yok
                  </div>
                )}
              </div>
            </div>

            {listing.teacher.specialization && (
              <div>
                <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Uzmanlık Alanı</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {listing.teacher.specialization}
                </p>
              </div>
            )}

            {listing.teacher.years_of_experience !== undefined && listing.teacher.years_of_experience !== null && (
              <div>
                <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Deneyim</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {listing.teacher.years_of_experience} yıl
                </p>
              </div>
            )}

            {listing.teacher.education && (
              <div>
                <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Eğitim</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {listing.teacher.education}
                </p>
              </div>
            )}

            {listing.teacher.bio && (
              <div>
                <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Hakkında</p>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {listing.teacher.bio}
                </p>
              </div>
            )}

            <Link to={`/profile/${listing.teacher_id}`}>
              <Button variant="outline" className="w-full mt-2">
                Profili Görüntüle
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Randevu Kartı - Mobilde 4. sırada */}
        <Card className="order-4 lg:order-none lg:col-span-2 border-2 border-primary/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
              <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Randevu Talep Et
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 md:space-y-6 p-5 md:p-6">
              <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-lg p-4 mb-5">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>Randevu oluşturmadan önce hocayla tarih ve saati konuşmalısınız.</span>
                </p>
              </div>

              <Link to="/messages">
                <Button className="w-full h-12 text-base" variant="outline" size="lg">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Mesaj Gönder
                </Button>
              </Link>

              <div className="border-t pt-5">
                <Label className="text-base font-semibold mb-4 block">Seans Süresi</Label>
                <RadioGroup
                  value={selectedDuration?.toString()}
                  onValueChange={(v) => setSelectedDuration(parseInt(v))}
                  className="space-y-3"
                >
                  {listing.prices.map((price) => (
                    <div
                      key={price.duration_minutes}
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value={price.duration_minutes.toString()}
                          id={`duration-${price.duration_minutes}`}
                        />
                        <Label
                          htmlFor={`duration-${price.duration_minutes}`}
                          className="cursor-pointer text-sm md:text-base font-medium flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4 text-primary" />
                          {price.duration_minutes} dakika
                        </Label>
                      </div>
                      <span className="font-bold text-base md:text-lg text-primary">{price.price} TL</span>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Tarih
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: tr }) : <span>Tarih seçin</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        locale={tr}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Saat
                  </Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Saat seçin" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return [
                          <SelectItem key={`${hour}:00`} value={`${hour}:00`}>{`${hour}:00`}</SelectItem>,
                          <SelectItem key={`${hour}:30`} value={`${hour}:30`}>{`${hour}:30`}</SelectItem>
                        ];
                      }).flat()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedPrice && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 border-2 border-primary/20">
                  <div className="flex items-center justify-between text-lg md:text-xl font-bold">
                    <span>Toplam Tutar:</span>
                    <span className="flex items-center text-primary">
                      <DollarSign className="h-5 w-5 md:h-6 md:w-6" />
                      {selectedPrice.price} TL
                    </span>
                  </div>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full h-12 text-base font-semibold"
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
                    <AlertDialogDescription className="space-y-2 text-base">
                      Randevunuzu onaylamak istediğinize emin misiniz?
                      <div className="mt-4 space-y-2 text-foreground">
                        <p><strong>Tarih:</strong> {selectedDate && format(selectedDate, 'dd MMMM yyyy', { locale: tr })}</p>
                        <p><strong>Saat:</strong> {selectedTime}</p>
                        <p><strong>Süre:</strong> {selectedDuration} dakika</p>
                        <p><strong>Tutar:</strong> {selectedPrice?.price} TL</p>
                      </div>
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

        {/* Yorumlar - Mobilde 5. sırada */}
        <Card className="order-5 lg:order-none lg:col-span-2 border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xl md:text-2xl flex items-center gap-2">
                  <Star className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  Yorumlar
                </span>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2 text-base md:text-lg">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{averageRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({reviews.length} değerlendirme)</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-sm md:text-base text-muted-foreground text-center py-6 md:py-8">
                  Henüz yorum bulunmuyor.
                </p>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b last:border-0 pb-4 md:pb-6 last:pb-0">
                      <div className="flex items-start gap-3 md:gap-4 mb-2 md:mb-3">
                        <Avatar className="w-8 h-8 md:w-10 md:h-10">
                          <AvatarImage src={review.customer.avatar_url || undefined} />
                          <AvatarFallback>
                            {review.customer.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start sm:items-center justify-between gap-2 mb-1">
                            <p className="font-semibold text-sm md:text-base truncate">{review.customer.username}</p>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 md:w-4 md:h-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1.5 md:mb-2">
                            {new Date(review.created_at).toLocaleDateString('tr-TR')}
                          </p>
                          <p className="text-xs md:text-sm text-foreground leading-relaxed">
                            {review.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
