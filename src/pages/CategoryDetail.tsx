import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { useCategoryWithSubcategories } from "@/lib/queries";

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useCategoryWithSubcategories(slug);

  if (isLoading) {
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

  if (!data?.category) {
    return (
      <div className="container py-8 md:py-12 px-4">
        <p className="text-center text-muted-foreground">Kategori bulunamadı.</p>
      </div>
    );
  }

  const { category, subCategories, listingCounts } = data;

  return (
    <div className="container py-8 md:py-12 px-4">
      <PageBreadcrumb
        customItems={[
          { label: "Kategorileri Keşfet", href: "/explore" },
          { label: category.name },
        ]}
      />
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{category.name}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {subCategories.length} alt kategori
        </p>
      </div>

      {subCategories.length === 0 ? (
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <p className="text-sm md:text-base text-muted-foreground">
              Bu kategoride henüz alt kategori bulunmuyor.
            </p>
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
                <CardContent className="p-4 sm:p-5 md:p-6 flex items-center justify-between pb-[12px] py-[24px]">
                  <h3 className="font-semibold text-base sm:text-lg">{subCat.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {listingCounts[subCat.id] || 0} ilan
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
