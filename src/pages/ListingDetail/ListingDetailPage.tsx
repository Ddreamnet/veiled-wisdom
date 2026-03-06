import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ConsultationType } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { MessageSquare, Calendar as CalendarIcon, Clock, Home, ChevronRight, Video, Package, Info } from "lucide-react";
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
  const [bookingLoading] = useState(false);
  

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

  const handleBooking = () => {
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
    const selectedPrice = listing?.prices.find(p => p.duration_minutes === selectedDuration);
    if (!selectedPrice || !listing) return;

    const startTs = new Date(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`);
    const endTs = new Date(startTs.getTime() + selectedDuration * 60000);

    navigate("/payment/method", {
      state: {
        listingId: listing.id,
        listingTitle: listing.title,
        teacherId: listing.teacher_id,
        teacherName: listing.teacher?.username || "Uzman",
        priceId: selectedPrice.id,
        price: selectedPrice.price,
        durationMinutes: selectedDuration,
        consultationType: listing.consultation_type,
        quantity: 1,
        startTs: startTs.toISOString(),
        endTs: endTs.toISOString(),
        selectedDate: selectedDate.toISOString(),
        selectedTime: selectedTime,
      }
    });
  };

  if (loading) {
    return (
      <div className="container py-6 md:py-10 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-48 sm:h-64 md:h-80 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div>
            <Skeleton className="h-48 w-full mb-4" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container py-8 px-4">
        <p className="text-center text-sm text-muted-foreground">İlan bulunamadı.</p>
      </div>
    );
  }

  const selectedPrice = listing.prices.find(p => p.duration_minutes === selectedDuration);

  // Booking card component (shared between mobile inline and desktop sidebar)
  const BookingCard = () => {
    const [calendarOpen, setCalendarOpen] = useState(false);

    return (
    <Card className="border border-primary/15 shadow-sm rounded-xl">
      <CardHeader className="px-4 py-2.5 bg-gradient-to-r from-primary/3 to-primary/6">
        <CardTitle className="text-sm md:text-base font-semibold flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Randevu Talep Et
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* Info box */}
        <div className="flex items-start gap-2.5 rounded-lg bg-primary/5 border border-primary/10 p-3">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Randevu oluşturmadan önce uzmanla tarih ve saati konuşmanızı öneriyoruz.
          </p>
        </div>

        <Button
          onClick={() => navigate(`/messages?userId=${listing.teacher_id}`)}
          className="w-full h-10 text-sm"
          variant="ghost"
          size="default"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Mesaj Gönder
        </Button>

        <div className="border-t pt-4">
          <Label className="text-sm font-semibold mb-3 block">
            {consultationType === "video" ? "Görüntülü Görüşme Paketi" : "Mesajlaşma Paketi"}
          </Label>
          <RadioGroup value={selectedDuration?.toString()} onValueChange={v => setSelectedDuration(parseInt(v))} className="space-y-2">
            {listing.prices.map(price => (
              <div
                key={price.duration_minutes}
                onClick={() => setSelectedDuration(price.duration_minutes)}
                className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <RadioGroupItem value={price.duration_minutes.toString()} id={`duration-${price.duration_minutes}`} />
                  <Label htmlFor={`duration-${price.duration_minutes}`} className="cursor-pointer text-xs md:text-sm font-medium flex items-center gap-1.5">
                    {consultationType === "video" ? <Video className="h-3.5 w-3.5 text-primary" /> : <MessageSquare className="h-3.5 w-3.5 text-primary" />}
                    {formatDurationLabel(price.duration_minutes, consultationType)}
                  </Label>
                </div>
                <span className="font-bold text-sm md:text-base text-primary">{price.price} TL</span>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              Tarih
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal text-sm", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (!date) return;
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Saat
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger className="h-10 text-sm">
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
          <div className="bg-primary/5 rounded-lg p-3.5 border border-primary/15">
            <div className="flex items-center justify-between text-base font-bold">
              <span>Toplam Tutar:</span>
              <span className="text-primary">{selectedPrice.price} TL</span>
            </div>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full h-10 text-sm font-semibold" size="default" disabled={!selectedDuration || !selectedDate || !selectedTime || bookingLoading}>
              Ödemeye Geç
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Randevu Onayı</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-sm">
                Randevunuzu onaylamak istediğinize emin misiniz?
                <div className="mt-3 space-y-1.5 text-foreground">
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
  );
  };

  // Product card component
  const ProductCard = () => (
    <Card className="border border-primary/15 shadow-sm rounded-xl">
      <CardHeader className="px-4 py-2.5 bg-gradient-to-r from-primary/3 to-primary/6">
        <CardTitle className="text-sm md:text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Ürün Satın Al
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {sortedPrices.length > 0 && (
          <RadioGroup
            value={selectedDuration?.toString() || ""}
            onValueChange={(val) => setSelectedDuration(Number(val))}
            className="space-y-2"
          >
            {sortedPrices.map(price => (
              <div key={price.duration_minutes} className="flex items-center space-x-2.5 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value={price.duration_minutes.toString()} id={`product-${price.duration_minutes}`} />
                <Label htmlFor={`product-${price.duration_minutes}`} className="flex-1 flex items-center justify-between cursor-pointer">
                  <span className="text-xs md:text-sm font-medium">{price.duration_minutes === 1 ? "1 adet" : `${price.duration_minutes} adet`}</span>
                  <span className="font-bold text-primary text-sm">{price.price} TL</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {selectedPrice && (
          <div className="bg-primary/5 rounded-lg p-3.5 border border-primary/15">
            <div className="flex items-center justify-between text-base font-bold">
              <span>Toplam Tutar:</span>
              <span className="text-primary">{selectedPrice.price} TL</span>
            </div>
          </div>
        )}

        <Button
          className="w-full h-10 text-sm font-semibold"
          size="default"
          disabled={!selectedDuration}
          onClick={() => {
            if (!user) {
              toast({ title: "Giriş Gerekli", description: "Satın almak için giriş yapmalısınız.", variant: "destructive" });
              navigate("/auth/sign-in");
              return;
            }
            if (!selectedPrice || !listing) return;
            navigate("/payment/method", {
              state: {
                listingId: listing.id,
                listingTitle: listing.title,
                teacherId: listing.teacher_id,
                teacherName: listing.teacher?.username || "Uzman",
                priceId: selectedPrice.id,
                price: selectedPrice.price,
                durationMinutes: selectedDuration,
                consultationType: "product",
                quantity: selectedDuration,
                startTs: null,
                endTs: null,
                selectedDate: null,
                selectedTime: null,
              }
            });
          }}
        >
          Satın Al
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-6 md:py-10 px-4 pb-28 lg:pb-10">
      {/* Breadcrumb - Desktop only */}
      <Breadcrumb className="mb-5 hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                Ana Sayfa
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          {listing.parentCategory && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/categories/${listing.parentCategory.slug}`}>{listing.parentCategory.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
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
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{listing.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-4 md:space-y-5">
          {/* Header and Image */}
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3">{listing.title}</h1>

            {listing.cover_url && (
              <div className="relative group overflow-hidden rounded-xl shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <img
                  src={listing.cover_url}
                  alt={listing.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
          </div>

          {/* Description Card */}
          <ListingDescriptionCard description={listing.description} />

          {/* Teacher Info Card */}
          <TeacherInfoCard
            teacher={listing.teacher}
            teacherId={listing.teacher_id}
            reviews={reviews}
            averageRating={averageRating}
            currentUserId={user?.id}
          />

          {/* Mobile: Booking/Product Card */}
          <div className="lg:hidden">
            {consultationType !== "product" ? <BookingCard /> : <ProductCard />}
          </div>

          {/* Reviews Section */}
          <ReviewsSection reviews={reviews} averageRating={averageRating} />
        </div>

        {/* Right Sidebar - Desktop Only (sticky booking) */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            {consultationType !== "product" ? <BookingCard /> : <ProductCard />}
          </div>
        </div>
      </div>
    </div>
  );
}
