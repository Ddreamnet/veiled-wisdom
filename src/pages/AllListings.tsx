import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { useAllListings } from '@/lib/queries';
import { getOptimizedThumbnailUrl, getOptimizedAvatarUrl } from '@/lib/imageOptimizer';

export default function AllListings() {
  const { data: listings, isLoading } = useAllListings();

  if (isLoading) {
    return (
      <div className="container py-8 md:py-12 px-4">
        <Skeleton className="h-5 md:h-6 w-72 md:w-96 mb-6 md:mb-8" />
        <Skeleton className="h-10 md:h-12 w-48 md:w-64 mb-6 md:mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <Skeleton className="h-40 sm:h-44 md:h-48 w-full rounded-t-lg" />
              <CardContent className="p-4 sm:p-5 md:p-6">
                <Skeleton className="h-5 md:h-6 w-28 md:w-32 mb-2" />
                <Skeleton className="h-4 w-20 md:w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const allListings = listings || [];

  return (
    <div className="container py-8 md:py-12 px-4">
      <PageBreadcrumb customItems={[
        { label: 'Tüm İlanlar' }
      ]} />

      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif">TÜM İLANLAR</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {allListings.length} aktif ilan
        </p>
      </div>

      {allListings.length === 0 ? (
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <p className="text-sm md:text-base text-muted-foreground">Henüz ilan bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {allListings.map((listing) => (
            <Link key={listing.id} to={`/listings/${listing.id}`}>
              <Card className="hover:shadow-glow transition-smooth h-full">
                {listing.cover_url ? (
                  <img
                    src={getOptimizedThumbnailUrl(listing.cover_url)}
                    alt={listing.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-40 sm:h-44 md:h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-40 sm:h-44 md:h-48 bg-primary/20 rounded-t-lg" />
                )}
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <Link
                    to={`/profile/${listing.teacher_id}`}
                    className="flex items-center gap-2 mb-3 hover:opacity-80 transition-smooth w-fit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {listing.profiles.avatar_url ? (
                      <img
                        src={getOptimizedAvatarUrl(listing.profiles.avatar_url)}
                        alt={listing.profiles.username}
                        loading="lazy"
                        decoding="async"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {listing.profiles.username}
                    </span>
                  </Link>
                  <h3 className="font-semibold text-base sm:text-lg mb-2">{listing.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {listing.description}
                  </p>
                  {listing.minPrice && (
                    <p className="text-sm font-semibold text-primary">
                      {listing.minPrice} ₺'den başlayan fiyatlarla
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
