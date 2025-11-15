import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Category, Listing } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';

type ListingWithTeacher = Listing & {
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

export default function SubCategoryDetail() {
  const { slug, subslug } = useParams<{ slug: string; subslug: string }>();
  const [mainCategory, setMainCategory] = useState<Category | null>(null);
  const [subCategory, setSubCategory] = useState<Category | null>(null);
  const [listings, setListings] = useState<ListingWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug && subslug) {
      fetchData();
    }
  }, [slug, subslug]);

  const fetchData = async () => {
    setLoading(true);

    // Get main category
    const { data: mainCat } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .is('parent_id', null)
      .single();

    if (mainCat) {
      setMainCategory(mainCat);

      // Get subcategory
      const { data: subCat } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', subslug)
        .eq('parent_id', mainCat.id)
        .single();

      if (subCat) {
        setSubCategory(subCat);

        // Get listings for this subcategory (fetch without profile join)
        const { data: listingsRows, error: listingsErr } = await supabase
          .from('listings')
          .select('*')
          .eq('category_id', subCat.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (listingsErr) {
          console.error('Listings fetch error:', listingsErr);
        }

        if (listingsRows && listingsRows.length > 0) {
          const teacherIds = Array.from(
            new Set(listingsRows.map((l) => l.teacher_id).filter(Boolean))
          ) as string[];

          let profilesMap: Record<string, { username: string; avatar_url: string | null }> = {};

          if (teacherIds.length > 0) {
            const { data: profilesData, error: profilesErr } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', teacherIds);

            if (profilesErr) {
              console.error('Profiles fetch error:', profilesErr);
            } else if (profilesData) {
              profilesMap = Object.fromEntries(
                profilesData.map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url }])
              );
            }
          }

          const merged = (listingsRows as Listing[]).map((l) => ({
            ...l,
            profiles: {
              username: profilesMap[l.teacher_id as string]?.username ?? 'Öğretmen',
              avatar_url: profilesMap[l.teacher_id as string]?.avatar_url ?? null,
            },
          })) as ListingWithTeacher[];

          setListings(merged);
        } else {
          setListings([]);
        }
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container py-8 md:py-12 px-4">
        <Skeleton className="h-5 md:h-6 w-72 md:w-96 mb-6 md:mb-8" />
        <Skeleton className="h-10 md:h-12 w-48 md:w-64 mb-6 md:mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
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

  if (!mainCategory || !subCategory) {
    return (
      <div className="container py-8 md:py-12 px-4">
        <p className="text-center text-sm md:text-base text-muted-foreground">Kategori bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4">
      <nav className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-6 md:mb-8">
        <Link to={`/categories/${slug}`} className="hover:text-foreground transition-smooth">
          {mainCategory.name}
        </Link>
        <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
        <span className="text-foreground">{subCategory.name}</span>
      </nav>

      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{subCategory.name}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {listings.length} aktif ilan
        </p>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <p className="text-sm md:text-base text-muted-foreground">Bu kategoride henüz ilan bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {listings.map((listing) => (
            <Link key={listing.id} to={`/listings/${listing.id}`}>
              <Card className="hover:shadow-glow transition-smooth h-full">
                {listing.cover_url ? (
                  <img
                    src={listing.cover_url}
                    alt={listing.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-40 sm:h-44 md:h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-40 sm:h-44 md:h-48 bg-primary/20 rounded-t-lg" />
                )}
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {listing.profiles.avatar_url ? (
                      <img
                        src={listing.profiles.avatar_url}
                        alt={listing.profiles.username}
                        loading="lazy"
                        decoding="async"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20" />
                    )}
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {listing.profiles.username}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg mb-2">{listing.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {listing.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
