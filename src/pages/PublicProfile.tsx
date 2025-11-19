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
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 lg:py-12 max-w-6xl">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.username || 'User'} />
              <AvatarFallback className="text-xl sm:text-2xl md:text-3xl">
                <User className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2 sm:space-y-3 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{profile.username || 'Kullanıcı'}</h1>
                {role && (
                  <Badge variant={role === 'teacher' ? 'default' : 'secondary'} className="w-fit">
                    {role === 'teacher' ? 'Eğitmen' : 'Müşteri'}
                  </Badge>
                )}
              </div>
              {profile.bio && <p className="text-sm sm:text-base text-muted-foreground">{profile.bio}</p>}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Katılım: {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
                </div>
              </div>
              {role === 'teacher' && (
                <Button onClick={handleContactClick} className="w-full sm:w-auto mt-2">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  İletişime Geç
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Teacher Listings */}
          {role === 'teacher' && listings.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                  İlanlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                {listings.map((listing) => {
                  const minPrice = listing.listing_prices.length
                    ? Math.min(...listing.listing_prices.map((p) => p.price))
                    : null;

                  return (
                    <div
                      key={listing.id}
                      onClick={() => navigate(`/listings/${listing.id}`)}
                      className="p-3 sm:p-4 border rounded-lg hover:border-primary transition-smooth cursor-pointer"
                    >
                      <div className="flex gap-3 sm:gap-4">
                        {listing.cover_url && (
                          <img
                            src={listing.cover_url}
                            alt={listing.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1 truncate">
                            {listing.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                            {listing.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                            <Badge variant="outline" className="text-xs">
                              {listing.categories.name}
                            </Badge>
                            {minPrice && (
                              <span className="text-primary font-semibold text-xs sm:text-sm">
                                {minPrice} ₺'den başlayan
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
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <p className="text-sm sm:text-base text-muted-foreground">Henüz aktif ilan bulunmuyor.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Reviews */}
        <div className="space-y-4 sm:space-y-6">
          {reviews.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                  {role === 'teacher' ? 'Alınan Yorumlar' : 'Yapılan Yorumlar'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                {reviews.map((review) => (
                  <div key={review.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage src={review.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{review.profiles.username}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${
                                i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{review.comment}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{review.listings.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {reviews.length === 0 && (
            <Card>
              <CardContent className="p-4 sm:p-6 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Henüz yorum bulunmuyor.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
