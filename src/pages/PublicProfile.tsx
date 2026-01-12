import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Star, MessageCircle, Briefcase, Calendar, GraduationCap, Award, Clock, ArrowRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { usePublicProfile } from "@/lib/queries";
import { getOptimizedThumbnailUrl, getOptimizedAvatarUrl } from "@/lib/imageOptimizer";

// Listing Card Component for expert profiles
function ListingCard({
  listing,
  onClick
}: {
  listing: any;
  onClick: () => void;
}) {
  const minPrice = listing.listing_prices?.length ? Math.min(...listing.listing_prices.map((p: any) => p.price)) : null;
  return <div onClick={onClick} className="group relative rounded-2xl border border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden cursor-pointer transition-all duration-500 hover:border-primary/30 hover:shadow-glow hover:-translate-y-1">
      {/* Cover Image */}
      {listing.cover_url ? <div className="relative h-44 sm:h-52 overflow-hidden">
          <img src={getOptimizedThumbnailUrl(listing.cover_url)} alt={listing.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          
          {/* Category Badge */}
          {listing.categories?.name && <Badge variant="secondary" className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-xs">
              {listing.categories.name}
            </Badge>}
        </div> : <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Briefcase className="h-12 w-12 text-primary/40" />
        </div>}

      {/* Content */}
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {listing.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {listing.description}
          </p>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-primary/10">
          {minPrice ? <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">₺{minPrice}</span>
              <span className="text-xs text-muted-foreground">'den başlayan</span>
            </div> : <span className="text-sm text-muted-foreground">Fiyat bilgisi yok</span>}
          
          <div className="flex items-center gap-1 text-xs font-medium text-primary/70 group-hover:text-primary transition-colors">
            <span>Detaylar</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>;
}

// Stats Badge Component
function StatBadge({
  icon: Icon,
  value,
  label,
  highlight = false
}: {
  icon: any;
  value: string | number;
  label: string;
  highlight?: boolean;
}) {
  return <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${highlight ? 'bg-primary/10 border-primary/30' : 'bg-background/50 backdrop-blur-sm border-primary/10'}`}>
      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${highlight ? 'text-primary fill-primary' : 'text-primary'}`} />
      <div className="flex flex-col">
        <span className="font-semibold text-sm sm:text-base">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>;
}
export default function PublicProfile() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data,
    isLoading: loading
  } = usePublicProfile(id);
  const fromExperts = location.state?.from === "experts";
  const profile = data?.profile;
  const role = data?.role;
  const listings = data?.listings || [];
  const reviews = data?.reviews || [];
  const teacherInfo = data?.teacherInfo;
  const averageRating = data?.averageRating || 0;
  const totalReviews = data?.totalReviews || 0;
  const handleContactClick = () => {
    navigate(`/messages?userId=${id}`);
  };
  if (loading) {
    return <div className="min-h-screen liquid-gradient">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <PageBreadcrumb />
          <div className="space-y-8">
            <Skeleton className="h-80 w-full rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          </div>
        </div>
      </div>;
  }
  if (!profile) {
    return <div className="min-h-screen liquid-gradient flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-10 w-10 text-primary" />
          </div>
          <p className="text-xl text-muted-foreground">Profil bulunamadı.</p>
        </div>
      </div>;
  }
  const isExpert = role === "teacher";
  return <div className="min-h-screen liquid-gradient">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 max-w-7xl">
        <PageBreadcrumb customItems={fromExperts ? [{
        label: "Uzmanlarımız",
        href: "/experts"
      }, {
        label: profile.username || "Uzman"
      }] : [{
        label: "Profil",
        href: "/profile"
      }, {
        label: profile.username || "Kullanıcı"
      }]} />

        {/* Hero Profile Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/20 shadow-elegant mb-10">
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(120,119,198,0.15),transparent_40%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(120,119,198,0.1),transparent_40%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />

          <div className="relative p-6 sm:p-10 lg:p-14">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12">
              {/* Avatar with glow effect */}
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-3 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent rounded-full blur-xl opacity-60" />
                <div className="absolute -inset-1.5 bg-gradient-to-b from-primary to-primary/30 rounded-full opacity-50" />
                <Avatar className="relative h-36 w-36 sm:h-44 sm:w-44 lg:h-48 lg:w-48 border-4 border-background shadow-2xl ring-2 ring-primary/30">
                  <AvatarImage src={getOptimizedAvatarUrl(profile.avatar_url, 192)} alt={profile.username || "User"} />
                  <AvatarFallback className="text-4xl sm:text-5xl lg:text-6xl bg-gradient-to-br from-primary/30 to-primary/10">
                    <User className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-primary" />
                  </AvatarFallback>
                </Avatar>
                {isExpert && <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow border-4 border-background">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center lg:text-left space-y-6">
                {/* Name & Badge */}
                <div className="space-y-3">
                  <div className="flex flex-col lg:flex-row items-center lg:items-center gap-3">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-gradient-silver">
                      {profile.username || "Kullanıcı"}
                    </h1>
                    {role && <Badge variant={isExpert ? "default" : "secondary"} className="text-sm px-4 py-1.5 font-medium">
                        {isExpert ? "✨ Uzman" : "👤 Danışan"}
                      </Badge>}
                  </div>

                  {/* Expert Specialization */}
                  {isExpert && teacherInfo?.specialization && <p className="text-lg sm:text-xl text-primary font-medium">
                      {teacherInfo.specialization}
                    </p>}

                  {/* Bio */}
                  {profile.bio && <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                      {profile.bio}
                    </p>}
                </div>

                {/* Stats Row */}
                

                {/* Education Info */}
                {isExpert && teacherInfo?.education && <div className="flex items-center justify-center lg:justify-start gap-2 text-muted-foreground">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span className="text-sm sm:text-base">{teacherInfo.education}</span>
                  </div>}

                {/* Contact Button */}
                {isExpert && <div className="pt-2">
                    <Button onClick={handleContactClick} size="lg" className="w-full sm:w-auto text-base sm:text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-glow transition-all duration-300">
                      <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                      İletişime Geç
                    </Button>
                  </div>}
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-10">
          {/* Listings Section - For Experts */}
          {isExpert && <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif">Sunulan Hizmetler</h2>
              </div>

              {listings.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing: any) => <ListingCard key={listing.id} listing={listing} onClick={() => navigate(`/listings/${listing.id}`)} />)}
                </div> : <Card className="border-primary/20 shadow-lg">
                  <CardContent className="p-12 sm:p-16 text-center space-y-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Briefcase className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-lg text-muted-foreground">Henüz aktif ilan bulunmuyor.</p>
                  </CardContent>
                </Card>}
            </section>}

          {/* Reviews Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Star className="h-6 w-6 text-primary fill-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif">
                {isExpert ? "Müşteri Değerlendirmeleri" : "Yorumlar"}
              </h2>
              {totalReviews > 0 && <Badge variant="outline" className="ml-2">
                  {totalReviews} yorum
                </Badge>}
            </div>

            {reviews.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {reviews.map((review: any) => <Card key={review.id} className="border-primary/10 bg-gradient-to-br from-card to-primary/5 hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border-2 border-primary/20">
                          <AvatarImage src={review.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{review.profiles?.username || "Anonim"}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {Array.from({
                        length: 5
                      }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />)}
                            <span className="text-xs text-muted-foreground ml-1">{review.rating}/5</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {review.comment}
                      </p>
                      {review.listings?.title && <p className="text-xs text-primary/70 font-medium flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {review.listings.title}
                        </p>}
                    </CardContent>
                  </Card>)}
              </div> : <Card className="border-primary/20 shadow-lg">
                <CardContent className="p-12 sm:p-16 text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Star className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-lg text-muted-foreground">Henüz değerlendirme bulunmuyor.</p>
                </CardContent>
              </Card>}
          </section>
        </div>
      </div>
    </div>;
}