import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, ListingPrice, Review, Category, ConsultationType } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Calendar as CalendarIcon, Clock, DollarSign, Star, Home, ChevronRight, Video } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
} from "@/components/ui/alert-dialog";
import { useListing } from "@/lib/queries";
import { getOptimizedCoverUrl, getOptimizedAvatarUrl } from "@/lib/imageOptimizer";

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

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: listing, isLoading: loading } = useListing(id);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const reviews = listing?.reviews || [];
  const averageRating = listing?.averageRating || 0;
  const consultationType: ConsultationType = listing?.consultation_type || 'video';

  const formatDurationLabel = (minutes: number, type: ConsultationType) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return type === 'video' 
          ? `${hours} saat görüntülü görüşme`
          : `${hours} saat mesajlaşma`;
      }
      return type === 'video'
        ? `${hours} saat ${remainingMinutes} dk görüntülü görüşme`
        : `${hours} saat ${remainingMinutes} dk mesajlaşma`;
    }
    return type === 'video'
      ? `${minutes} dakika görüntülü görüşme`
      : `${minutes} dakika mesajlaşma`;
  };

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "Giriş Gerekli",
        description: "Randevu almak için giriş yapmalısınız.",
        variant: "destructive",
      });
      navigate("/auth/sign-in");
      return;
    }

    if (!selectedDuration || !selectedDate || !selectedTime) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen seans süresi, tarih ve saat seçin.",
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(true);

    const selectedPrice = listing?.prices.find((p) => p.duration_minutes === selectedDuration);

    if (!selectedPrice || !listing) {
      setBookingLoading(false);
      return;
    }

    const startTs = selectedDate ? new Date(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`) : new Date();
    const endTs = new Date(startTs.getTime() + selectedDuration * 60000);

    const { error } = await supabase.from("appointments").insert({
      listing_id: listing.id,
      customer_id: user.id,
      teacher_id: listing.teacher_id,
      status: "pending",
      start_ts: startTs.toISOString(),
      end_ts: endTs.toISOString(),
      duration_minutes: selectedDuration,
      price_at_booking: selectedPrice.price,
    });

    if (error) {
      toast({
        title: "Hata",
        description: "Randevu oluşturulamadı.",
        variant: "destructive",
      });
      setBookingLoading(false);
      return;
    }

    // Get user profiles for email
    const { data: customerProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: teacherProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", listing.teacher_id)
      .maybeSingle();

    // Send email notifications
    try {
      await supabase.functions.invoke("send-appointment-email", {
        body: {
          customerUserId: user.id,
          customerName: customerProfile?.username || "Kullanıcı",
          teacherUserId: listing.teacher_id,
          teacherName: teacherProfile?.username || listing.teacher.username,
          listingTitle: listing.title,
          startTime: startTs.toISOString(),
          duration: selectedDuration,
          price: selectedPrice.price,
        },
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't block the booking if email fails
    }

    toast({
      title: "Randevu Oluşturuldu",
      description: "Randevunuz başarıyla oluşturuldu. Email bildirimleri gönderildi.",
    });

    navigate("/appointments");
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

  const selectedPrice = listing.prices.find((p) => p.duration_minutes === selectedDuration);

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
                  <Link to={`/categories/${listing.parentCategory.slug}`}>{listing.parentCategory.name}</Link>
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
                  <Link
                    to={
                      listing.parentCategory
                        ? `/categories/${listing.parentCategory.slug}/${listing.category.slug}`
                        : `/categories/${listing.category.slug}`
                    }
                  >
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Sol Kolon - Ana İçerik */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Görsel - Mobilde 1. sırada */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{listing.title}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                consultationType === 'video' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-secondary text-secondary-foreground'
              }`}>
                {consultationType === 'video' ? (
                  <>
                    <Video className="h-4 w-4" />
                    Görüntülü
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Mesajlaşma
                  </>
                )}
              </span>
            </div>

            {listing.cover_url && (
              <div className="relative group overflow-hidden rounded-xl shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <img
                  src={getOptimizedCoverUrl(listing.cover_url)}
                  alt={listing.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-64 sm:h-80 md:h-96 lg:h-[28rem] object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
          </div>

          {/* İlan Açıklaması - Mobilde 2. sırada, Masaüstünde sidebar'da */}
          <Card className="lg:hidden border-2 shadow-md">
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

          {/* Uzman Hakkında - Mobilde 3. sırada, Masaüstünde sidebar'da */}
          <Card className="lg:hidden border-2 shadow-md">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Uzman Hakkında
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-5 p-5 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 pb-3 md:pb-4 border-b">
                {listing.teacher.avatar_url ? (
                  <img
                    src={getOptimizedAvatarUrl(listing.teacher.avatar_url)}
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
                  <h3 className="font-semibold text-base md:text-lg mb-1 truncate">{listing.teacher.username}</h3>
                  {reviews.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                      <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{averageRating.toFixed(1)}</span>
                      <span className="text-xs md:text-sm">({reviews.length} değerlendirme)</span>
                    </div>
                  ) : (
                    <div className="text-xs md:text-sm text-muted-foreground">Henüz değerlendirme yok</div>
                  )}
                </div>
              </div>

              {listing.teacher.specialization && (
                <div>
                  <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Uzmanlık Alanı</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{listing.teacher.specialization}</p>
                </div>
              )}

              {listing.teacher.years_of_experience !== undefined && listing.teacher.years_of_experience !== null && (
                <div>
                  <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Deneyim</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{listing.teacher.years_of_experience} yıl</p>
                </div>
              )}

              {listing.teacher.education && (
                <div>
                  <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Eğitim</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{listing.teacher.education}</p>
                </div>
              )}

              {listing.teacher.bio && (
                <div>
                  <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Hakkında</p>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{listing.teacher.bio}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {user && user.id !== listing.teacher_id && (
                  <Button
                    onClick={() => navigate(`/messages?userId=${listing.teacher_id}`)}
                    className="w-full"
                    variant="default"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Mesaj Gönder
                  </Button>
                )}

                <Link to={`/profile/${listing.teacher_id}`}>
                  <Button variant="outline" className="w-full">
                    Profili Görüntüle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Randevu Kartı - Mobilde 4. sırada */}
          <Card className="border-2 border-primary/20 shadow-lg">
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
                  <span>Randevu oluşturmadan önce uzmanla tarih ve saati konuşmalısınız.</span>
                </p>
              </div>

              <Button
                onClick={() => navigate(`/messages?userId=${listing.teacher_id}`)}
                className="w-full h-12 text-base"
                variant="outline"
                size="lg"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Mesaj Gönder
              </Button>

              <div className="border-t pt-5">
                <Label className="text-base font-semibold mb-4 block">
                  {consultationType === 'video' ? 'Görüntülü Görüşme Paketi' : 'Mesajlaşma Paketi'}
                </Label>
                <RadioGroup
                  value={selectedDuration?.toString()}
                  onValueChange={(v) => setSelectedDuration(parseInt(v))}
                  className="space-y-3"
                >
                  {listing.prices.map((price) => (
                    <div
                      key={price.duration_minutes}
                      onClick={() => setSelectedDuration(price.duration_minutes)}
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
                          {consultationType === 'video' ? (
                            <Video className="h-4 w-4 text-primary" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-primary" />
                          )}
                          {formatDurationLabel(price.duration_minutes, consultationType)}
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
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}
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
                        const hour = i.toString().padStart(2, "0");
                        return [
                          <SelectItem key={`${hour}:00`} value={`${hour}:00`}>{`${hour}:00`}</SelectItem>,
                          <SelectItem key={`${hour}:30`} value={`${hour}:30`}>{`${hour}:30`}</SelectItem>,
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
                    <span className="text-primary">{selectedPrice.price} TL</span>
                  </div>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    size="lg"
                    disabled={!selectedDuration || !selectedDate || !selectedTime || bookingLoading}
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
                        <p>
                          <strong>Tarih:</strong> {selectedDate && format(selectedDate, "dd MMMM yyyy", { locale: tr })}
                        </p>
                        <p>
                          <strong>Saat:</strong> {selectedTime}
                        </p>
                        <p>
                          <strong>Süre:</strong> {selectedDuration} dakika
                        </p>
                        <p>
                          <strong>Tutar:</strong> {selectedPrice?.price} TL
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBooking}>Onayla ve Ödemeye Geç</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Yorumlar - Mobilde 5. sırada */}
          <Card className="border-2">
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
                          <AvatarFallback>{review.customer.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start sm:items-center justify-between gap-2 mb-1">
                            <p className="font-semibold text-sm md:text-base truncate">{review.customer.username}</p>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 md:w-4 md:h-4 ${
                                    i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1.5 md:mb-2">
                            {new Date(review.created_at).toLocaleDateString("tr-TR")}
                          </p>
                          <p className="text-xs md:text-sm text-foreground leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ Sidebar - Sadece Desktop'ta görünür */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-5 md:space-y-6">
            {/* İlan Açıklaması */}
            <Card className="border-2 shadow-md">
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

            {/* Uzman Hakkında */}
            <Card className="border-2 shadow-md">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Uzman Hakkında
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-5 p-5 md:p-6">
                <div className="flex items-start gap-3 md:gap-4 pb-3 md:pb-4 border-b">
                  {listing.teacher.avatar_url ? (
                    <img
                      src={getOptimizedAvatarUrl(listing.teacher.avatar_url)}
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
                    <h3 className="font-semibold text-base md:text-lg mb-1 truncate">{listing.teacher.username}</h3>
                    {reviews.length > 0 ? (
                      <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                        <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{averageRating.toFixed(1)}</span>
                        <span className="text-xs md:text-sm">({reviews.length} değerlendirme)</span>
                      </div>
                    ) : (
                      <div className="text-xs md:text-sm text-muted-foreground">Henüz değerlendirme yok</div>
                    )}
                  </div>
                </div>

                {listing.teacher.specialization && (
                  <div>
                    <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Uzmanlık Alanı</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{listing.teacher.specialization}</p>
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
                    <p className="text-xs md:text-sm text-muted-foreground">{listing.teacher.education}</p>
                  </div>
                )}

                {listing.teacher.bio && (
                  <div>
                    <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">Hakkında</p>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{listing.teacher.bio}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {user && user.id !== listing.teacher_id && (
                    <Button
                      onClick={() => navigate(`/messages?userId=${listing.teacher_id}`)}
                      className="w-full"
                      variant="default"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Mesaj Gönder
                    </Button>
                  )}

                  <Link to={`/profile/${listing.teacher_id}`}>
                    <Button variant="outline" className="w-full">
                      Profili Görüntüle
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
