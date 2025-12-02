import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase, Category } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchCategory();
    }
  }, [slug]);

  const fetchCategory = async () => {
    setLoading(true);

    // Get main category
    const { data: categoryData } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .is("parent_id", null)
      .single();

    if (!categoryData) {
      setLoading(false);
      return;
    }

    setCategory(categoryData);

    // Get subcategories
    const { data: subCategoriesData } = await supabase
      .from("categories")
      .select("*")
      .eq("parent_id", categoryData.id)
      .order("display_order", { ascending: true });

    if (subCategoriesData) {
      setSubCategories(subCategoriesData);

      // Get listing counts for each subcategory
      const counts: Record<string, number> = {};
      for (const subCat of subCategoriesData) {
        const { count } = await supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("category_id", subCat.id)
          .eq("is_active", true);

        counts[subCat.id] = count || 0;
      }
      setListingCounts(counts);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container py-8 md:py-12 px-4">
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

  if (!category) {
    return (
      <div className="container py-8 md:py-12 px-4">
        <p className="text-center text-muted-foreground">Kategori bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4">
      <PageBreadcrumb customItems={[{ label: "Kategorileri Keşfet", href: "/explore" }, { label: category.name }]} />
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{category.name}</h1>
        <p className="text-sm md:text-base text-muted-foreground">{subCategories.length} alt kategori</p>
      </div>

      {subCategories.length === 0 ? (
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <p className="text-sm md:text-base text-muted-foreground">Bu kategoride henüz alt kategori bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {subCategories.map((subCat) => (
            <Link key={subCat.id} to={`/categories/${slug}/${subCat.slug}`}>
              <Card className="hover:shadow-glow transition-smooth h-full">
                {subCat.image_url ? (
                  <img
                    src={subCat.image_url}
                    alt={subCat.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-40 sm:h-44 md:h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-40 sm:h-44 md:h-48 bg-primary/20 rounded-t-lg" />
                )}
                <CardContent className="p-4 sm:p-5 md:p-6 flex items-center justify-between">
                  <h3 className="font-semibold text-base sm:text-lg">{subCat.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{listingCounts[subCat.id] || 0} ilan</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
