import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, ListingPrice, ConsultationType } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { MessageSquare, Calendar as CalendarIcon, Clock, Star, Home, ChevronRight, Video, Package, ShoppingCart } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useListing } from "@/lib/queries";
import { getOptimizedCoverUrl } from "@/lib/imageOptimizer";
import { TeacherInfoCard, ReviewsSection, ListingDescriptionCard } from "./components";

export default function ListingDetailPage() {
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
  const consultationType: ConsultationType = listing?.consultation_type || "video";

  const formatDurationLabel = (minutes: number, type: ConsultationType) => {
    if (type === "product") {
      return minutes === 1 ? "1 adet" : `${minutes} adet`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return type === "video" ? `${hours} saat görüntülü görüşme` : `${hours} saat mesajlaşma`;
      }
      return type === "video" ? `${hours} saat ${remainingMinutes} dk görüntülü görüşme` : `${hours} saat ${remainingMinutes} dk mesajlaşma`;
    }
    return type === "video" ? `${minutes} dakika görüntülü görüşme` : `${minutes} dakika mesajlaşma`;
  };

  const sortedPrices = listing?.prices ? [...listing.prices].sort((a, b) => a.duration_minutes - b.duration_minutes) : [];
  const unitPrice = consultationType === 'product' && sortedPrices.length > 0 ? sortedPrices[0] : null;
  const productPackages = consultationType === 'product' ? sortedPrices.slice(1) : [];

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "Giriş Gerekli",
        description: "Randevu almak için giriş yapmalısınız.",
        variant: "destructive"
      });
      navigate("/auth/sign-in");
      return;
    }
    if (!selectedDuration || !selectedDate || !selectedTime) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen seans süresi, tarih ve saat seçin.",
        variant: "destructive"
      });
      return;
    }
    setBookingLoading(true);
    const selectedPrice = listing?.prices.find(p => p.duration_minutes === selectedDuration);
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
      price_at_booking: selectedPrice.price
    });
    if (error) {
      toast({
        title: "Hata",
        description: "Randevu oluşturulamadı.",
        variant: "destructive"
      });
      setBookingLoading(false);
      return;
    }

    const { data: customerProfile } = await supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle();
    const { data: teacherProfile } = await supabase.from("profiles").select("username").eq("user_id", listing.teacher_id).maybeSingle();

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
          price: selectedPrice.price
        }
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }
    toast({
      title: "Randevu Oluşturuldu",
      description: "Randevunuz başarıyla oluşturuldu. Email bildirimleri gönderildi."
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

  const selectedPrice = listing.prices.find(p => p.duration_minutes === selectedDuration);

  return (
    <div className="container py-8 md:py-12 px-4">
      {/* Breadcrumb - Desktop only */}
      <Breadcrumb className="mb-6 hidden md:flex">
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
                  <Link to={listing.parentCategory ? `/categories/${listing.parentCategory.slug}/${listing.category.slug}` : `/categories/${listing.category.slug}`}>
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
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Header and Image */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{listing.title}</h1>
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

          {/* Mobile: Description Card */}
          <div className="lg:hidden">
            <ListingDescriptionCard description={listing.description} />
          </div>

          {/* Mobile: Teacher Info Card */}
          <div className="lg:hidden">
            <TeacherInfoCard
              teacher={listing.teacher}
              teacherId={listing.teacher_id}
              reviews={reviews}
              averageRating={averageRating}
              currentUserId={user?.id}
            />
          </div>

          {/* Booking Card - Video/Messaging Only */}
          {consultationType !== "product" && (
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

                <Button onClick={() => navigate(`/messages?userId=${listing.teacher_id}`)} className="w-full h-12 text-base" variant="outline" size="lg">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Mesaj Gönder
                </Button>

                <div className="border-t pt-5">
                  <Label className="text-base font-semibold mb-4 block">
                    {consultationType === "video" ? "Görüntülü Görüşme Paketi" : "Mesajlaşma Paketi"}
                  </Label>
                  <RadioGroup value={selectedDuration?.toString()} onValueChange={v => setSelectedDuration(parseInt(v))} className="space-y-3">
                    {listing.prices.map(price => (
                      <div key={price.duration_minutes} onClick={() => setSelectedDuration(price.duration_minutes)} className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={price.duration_minutes.toString()} id={`duration-${price.duration_minutes}`} />
                          <Label htmlFor={`duration-${price.duration_minutes}`} className="cursor-pointer text-sm md:text-base font-medium flex items-center gap-2">
                            {consultationType === "video" ? <Video className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
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
                        <Button variant="outline" className={cn("w-full h-12 justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
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
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Saat seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={`${hour}:00`} value={`${hour}:00`}>{hour}:00</SelectItem>
                          );
                        })}
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
                    <Button className="w-full h-12 text-base font-semibold" size="lg" disabled={!selectedDuration || !selectedDate || !selectedTime || bookingLoading}>
                      Ödemeye Geç
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Randevu Onayı</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2 text-base">
                        Randevunuzu onaylamak istediğinize emin misiniz?
                        <div className="mt-4 space-y-2 text-foreground">
                          <p><strong>Tarih:</strong> {selectedDate && format(selectedDate, "dd MMMM yyyy", { locale: tr })}</p>
                          <p><strong>Saat:</strong> {selectedTime}</p>
                          <p><strong>Süre:</strong> {selectedDuration} dakika</p>
                          <p><strong>Tutar:</strong> {selectedPrice?.price} TL</p>
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
          )}

          {/* Product Purchase Card */}
          {consultationType === "product" && (
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  Ürün Satın Al
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 md:space-y-6 p-5 md:p-6">
                <Button onClick={() => navigate(`/messages?userId=${listing.teacher_id}`)} className="w-full h-12 text-base" variant="outline" size="lg">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Mesaj Gönder
                </Button>

                <div className="border-t pt-5">
                  <Label className="text-base font-semibold mb-4 block">Adet Seçimi</Label>
                  <RadioGroup value={selectedDuration?.toString()} onValueChange={v => setSelectedDuration(parseInt(v))} className="space-y-3">
                    {unitPrice && (
                      <div onClick={() => setSelectedDuration(unitPrice.duration_minutes)} className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={unitPrice.duration_minutes.toString()} id={`duration-${unitPrice.duration_minutes}`} />
                          <Label htmlFor={`duration-${unitPrice.duration_minutes}`} className="cursor-pointer text-sm md:text-base font-medium flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            1 Adet
                          </Label>
                        </div>
                        <span className="font-bold text-base md:text-lg text-primary">{unitPrice.price} TL</span>
                      </div>
                    )}
                    
                    {productPackages.map(price => (
                      <div key={price.duration_minutes} onClick={() => setSelectedDuration(price.duration_minutes)} className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={price.duration_minutes.toString()} id={`duration-${price.duration_minutes}`} />
                          <Label htmlFor={`duration-${price.duration_minutes}`} className="cursor-pointer text-sm md:text-base font-medium flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            {price.duration_minutes} Adet
                            {unitPrice && (
                              <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                                (Birim: {(price.price / price.duration_minutes).toFixed(2)} TL)
                              </span>
                            )}
                          </Label>
                        </div>
                        <span className="font-bold text-base md:text-lg text-primary">{price.price} TL</span>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {selectedPrice && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 border-2 border-primary/20">
                    <div className="flex items-center justify-between text-lg md:text-xl font-bold">
                      <span>Toplam Tutar:</span>
                      <span className="text-primary">{selectedPrice.price} TL</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedDuration === 1 ? "1 adet" : `${selectedDuration} adet`} ürün
                    </p>
                  </div>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full h-12 text-base font-semibold" size="lg" disabled={!selectedDuration || bookingLoading}>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Satın Al
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Satın Alma Onayı</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2 text-base">
                        Satın almak istediğinize emin misiniz?
                        <div className="mt-4 space-y-2 text-foreground">
                          <p><strong>Ürün:</strong> {listing.title}</p>
                          <p><strong>Adet:</strong> {selectedDuration === 1 ? "1 adet" : `${selectedDuration} adet`}</p>
                          <p><strong>Tutar:</strong> {selectedPrice?.price} TL</p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBooking}>Onayla ve Satın Al</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}

          {/* Reviews Section */}
          <ReviewsSection reviews={reviews} averageRating={averageRating} />
        </div>

        {/* Right Sidebar - Desktop Only */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-5 md:space-y-6">
            <ListingDescriptionCard description={listing.description} />
            <TeacherInfoCard
              teacher={listing.teacher}
              teacherId={listing.teacher_id}
              reviews={reviews}
              averageRating={averageRating}
              currentUserId={user?.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
