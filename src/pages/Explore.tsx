import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Category } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';

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
    <div className="container py-12">
      <h1 className="text-4xl font-serif font-bold text-gradient-silver mb-8">Kategorileri Keşfet</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {categories.map((category) => (
          <Link key={category.id} to={`/categories/${category.slug}`}>
            <Card className="group overflow-hidden h-full">
              {category.image_url && (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg text-silver group-hover:text-gradient-purple transition-all">
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
