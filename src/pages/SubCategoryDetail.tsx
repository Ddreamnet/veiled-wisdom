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

        // Get listings for this subcategory
        const { data: listingsData } = await supabase
          .from('listings')
          .select('*, profiles(username, avatar_url)')
          .eq('category_id', subCat.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (listingsData) {
          setListings(listingsData as any);
        }
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-6 w-96 mb-8" />
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!mainCategory || !subCategory) {
    return (
      <div className="container py-12">
        <p className="text-center text-muted-foreground">Kategori bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link to={`/categories/${slug}`} className="hover:text-foreground transition-smooth">
          {mainCategory.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{subCategory.name}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{subCategory.name}</h1>
        <p className="text-muted-foreground">
          {listings.length} aktif ilan
        </p>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Bu kategoride henüz ilan bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <Link key={listing.id} to={`/listings/${listing.id}`}>
              <Card className="hover:shadow-glow transition-smooth h-full">
                {listing.cover_url ? (
                  <img
                    src={listing.cover_url}
                    alt={listing.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-primary/20 rounded-t-lg" />
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {listing.profiles.avatar_url ? (
                      <img
                        src={listing.profiles.avatar_url}
                        alt={listing.profiles.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {listing.profiles.username}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{listing.title}</h3>
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
