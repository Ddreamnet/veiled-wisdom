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
      <h1 className="text-4xl font-bold mb-8">Kategorileri Keşfet</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link key={category.id} to={`/categories/${category.slug}`}>
            <Card className="hover:shadow-glow transition-smooth">
              <CardContent className="p-6">
                {category.image_url && (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-40 object-cover rounded-md mb-4"
                  />
                )}
                <h3 className="font-semibold text-lg">{category.name}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
