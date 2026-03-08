import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedBreadcrumb as PageBreadcrumb } from '@/components/UnifiedBreadcrumb';
import { useAllListings } from '@/lib/queries';
import { ListingCard } from '@/components/ListingCard';

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
        <h1 className="text-2xl md:text-3xl font-bold mb-2 font-serif">TÜM İLANLAR</h1>
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
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
