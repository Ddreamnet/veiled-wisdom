import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Category } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

export default function Explore() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null);
    
    if (data) setCategories(data);
  };

  return (
    <div className="container py-8 md:py-12 px-4">
      <PageBreadcrumb />
      <h1 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-6 md:mb-8">Kategorileri Keşfet</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {categories.map((category) => (
          <Link key={category.id} to={`/categories/${category.slug}`}>
            <Card className="group overflow-hidden h-full card-hover">
              {category.image_url && (
                <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                  <img
                    src={category.image_url}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-transparent to-transparent" />
                </div>
              )}
              <CardContent className="p-4 sm:p-5 md:p-6">
                <h3 className="font-semibold text-base sm:text-lg text-silver group-hover:text-gradient-purple transition-all">
                  {category.name}
                </h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
