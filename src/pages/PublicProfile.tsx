import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Profile, UserRole, Listing, Review } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, MapPin, Calendar, Star, MessageCircle, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

type ListingWithCategory = Listing & {
  categories: {
    name: string;
    slug: string;
  };
  listing_prices: { price: number }[];
};

type ReviewWithDetails = Review & {
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  listings: {
    title: string;
  };
};

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [listings, setListings] = useState<ListingWithCategory[]>([]);
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);

  useEffect(() => {
    if (id) {
      fetchProfileData();
    }
  }, [id]);

  const fetchProfileData = async () => {
    if (!id) return;

    setLoading(true);

    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      toast({
        title: 'Hata',
        description: 'Profil bilgileri yüklenemedi.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (!profileData) {
      toast({
        title: 'Hata',
        description: 'Kullanıcı bulunamadı.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setProfile(profileData);

    // Fetch role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', id)
      .maybeSingle();

    const userRole = roleData?.role as UserRole | null;
    setRole(userRole);

    // If teacher, fetch listings
    if (userRole === 'teacher') {
      const { data: listingsData } = await supabase
        .from('listings')
        .select(`
          *,
          categories(name, slug),
          listing_prices(price)
        `)
        .eq('teacher_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (listingsData) {
        setListings(listingsData as ListingWithCategory[]);

        // Fetch reviews received on teacher's listings
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles!reviews_customer_id_fkey(username, avatar_url),
            listings(title)
          `)
          .in('listing_id', listingsData.map((l) => l.id))
          .order('created_at', { ascending: false })
          .limit(10);

        if (reviewsData) {
          setReviews(reviewsData as ReviewWithDetails[]);
        }
      }
    } else {
      // Reviews given by this user
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!reviews_customer_id_fkey(username, avatar_url),
          listings(title)
        `)
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsData) {
        setReviews(reviewsData as ReviewWithDetails[]);
      }
    }

    setLoading(false);
  };

  const handleContactClick = () => {
    // Navigate to messages with userId parameter
    navigate(`/messages?userId=${id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 lg:py-12 max-w-6xl">
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Profil bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 max-w-7xl">
        {/* Profile Header with gradient background */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 shadow-glow mb-6 sm:mb-8">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(120,119,198,0.08),transparent_50%)]" />
          
          <div className="relative p-6 sm:p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
              {/* Avatar with decorative ring */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-full blur-sm group-hover:blur-md transition-all duration-300 opacity-75" />
                <Avatar className="relative h-28 w-28 sm:h-36 sm:w-36 lg:h-40 lg:w-40 border-4 border-background shadow-xl">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.username || 'User'} />
                  <AvatarFallback className="text-3xl sm:text-4xl lg:text-5xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <User className="h-14 w-14 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center lg:text-left space-y-4 sm:space-y-5">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                      {profile.username || 'Kullanıcı'}
                    </h1>
                    {role && (
                      <Badge 
                        variant={role === 'teacher' ? 'default' : 'secondary'} 
                        className="text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-1.5"
                      >
                        {role === 'teacher' ? '✨ Eğitmen' : '👤 Müşteri'}
                      </Badge>
                    )}
                  </div>
                  
                  {profile.bio && (
                    <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm sm:text-base text-muted-foreground">
                  <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full border border-primary/10">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="font-medium">
                      {format(new Date(profile.created_at), 'MMMM yyyy')}
                    </span>
                  </div>
                  
                  {role === 'teacher' && listings.length > 0 && (
                    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full border border-primary/10">
                      <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <span className="font-medium">{listings.length} İlan</span>
                    </div>
                  )}
                  
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full border border-primary/10">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary fill-primary" />
                      <span className="font-medium">{reviews.length} Yorum</span>
                    </div>
                  )}
                </div>

                {role === 'teacher' && (
                  <Button 
                    onClick={handleContactClick} 
                    size="lg"
                    className="w-full sm:w-auto mt-2 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-xl shadow-lg hover:shadow-glow transition-all duration-300"
                  >
                    <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                    İletişime Geç
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content - Listings */}
          <div className="xl:col-span-2 space-y-6 sm:space-y-8">
            {role === 'teacher' && listings.length > 0 && (
              <Card className="border-primary/20 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10 p-5 sm:p-6 lg:p-8">
                  <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                    <div className="p-2 bg-primary/20 rounded-xl">
                      <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span>Sunulan Hizmetler</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
                  {listings.map((listing) => {
                    const minPrice = listing.listing_prices.length
                      ? Math.min(...listing.listing_prices.map((p) => p.price))
                      : null;

                    return (
                      <div
                        key={listing.id}
                        onClick={() => navigate(`/listings/${listing.id}`)}
                        className="group relative p-4 sm:p-5 lg:p-6 border border-primary/10 rounded-2xl hover:border-primary/30 hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-to-br from-background to-primary/5"
                      >
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                          {listing.cover_url && (
                            <div className="relative overflow-hidden rounded-xl flex-shrink-0 w-full sm:w-28 h-48 sm:h-28">
                              <img
                                src={listing.cover_url}
                                alt={listing.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                            <h3 className="font-bold text-lg sm:text-xl group-hover:text-primary transition-colors duration-300">
                              {listing.title}
                            </h3>
                            <p className="text-sm sm:text-base text-muted-foreground line-clamp-2 leading-relaxed">
                              {listing.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <Badge variant="outline" className="text-xs sm:text-sm px-3 py-1 border-primary/30 bg-primary/5">
                                {listing.categories.name}
                              </Badge>
                              {minPrice && (
                                <span className="text-primary font-bold text-base sm:text-lg flex items-center gap-1">
                                  <span className="text-xs sm:text-sm text-muted-foreground">₺</span>
                                  {minPrice}
                                  <span className="text-xs sm:text-sm text-muted-foreground font-normal">'den başlayan</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {role === 'teacher' && listings.length === 0 && (
              <Card className="border-primary/20 shadow-lg">
                <CardContent className="p-12 sm:p-16 text-center space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Briefcase className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  </div>
                  <p className="text-base sm:text-lg text-muted-foreground">Henüz aktif ilan bulunmuyor.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Reviews */}
          <div className="space-y-6 sm:space-y-8">
            {reviews.length > 0 && (
              <Card className="border-primary/20 shadow-lg overflow-hidden sticky top-24">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10 p-5 sm:p-6">
                  <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                    <div className="p-2 bg-primary/20 rounded-xl">
                      <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary fill-primary" />
                    </div>
                    <span>{role === 'teacher' ? 'Değerlendirmeler' : 'Yorumlar'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {reviews.map((review) => (
                    <div 
                      key={review.id} 
                      className="p-4 sm:p-5 border border-primary/10 rounded-xl space-y-3 bg-gradient-to-br from-background to-primary/5 hover:border-primary/30 transition-colors duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/20">
                          <AvatarImage src={review.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm sm:text-base font-semibold truncate">{review.profiles.username}</p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${
                                  i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                            <span className="text-xs sm:text-sm text-muted-foreground ml-1">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        {review.comment}
                      </p>
                      <p className="text-xs sm:text-sm text-primary/70 font-medium">
                        {review.listings.title}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {reviews.length === 0 && (
              <Card className="border-primary/20 shadow-lg">
                <CardContent className="p-8 sm:p-12 text-center space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Star className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground">Henüz yorum bulunmuyor.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
