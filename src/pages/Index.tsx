import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Category, Curiosity } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function Index() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [curiosities, setCuriosities] = useState<Curiosity[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .limit(4);

    const { data: curiositiesData } = await supabase
      .from('curiosities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (categoriesData) setCategories(categoriesData);
    if (curiositiesData) setCuriosities(curiositiesData);
  };

  return (
    <div className="min-h-screen">
      <section className="container py-20 text-center animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Leyl - Gizli İlimler Platformu
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Antik bilgelik ve modern yaklaşımın buluştuğu platform. Uzman hocalarımızla tanışın ve yolculuğunuza başlayın.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/explore">
            <Button size="lg" className="shadow-glow">Keşfet</Button>
          </Link>
          <Link to="/auth/sign-up">
            <Button size="lg" variant="outline">Kayıt Ol</Button>
          </Link>
        </div>
      </section>

      <section className="container py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Merak Konuları</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {curiosities.map((curiosity) => (
            <Card key={curiosity.id} className="hover:shadow-glow transition-smooth">
              <CardHeader>
                {curiosity.cover_url && (
                  <img
                    src={curiosity.cover_url}
                    alt={curiosity.title}
                    className="w-full h-48 object-cover rounded-md mb-4"
                  />
                )}
                <CardTitle>{curiosity.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {curiosity.content.substring(0, 100)}...
                </p>
                <Link to={`/curiosities/${curiosity.slug}`}>
                  <Button variant="ghost" size="sm">
                    Yazıyı inceleyin <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-3xl font-bold mb-8">Kategoriler</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link key={category.id} to={`/categories/${category.slug}`}>
              <Card className="hover:shadow-glow transition-smooth h-full">
                {category.image_url && (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">Aktif ilanları keşfedin</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Kullanıcı Yorumları</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 mr-4" />
                  <div>
                    <p className="font-semibold">Kullanıcı {i}</p>
                    <p className="text-sm text-muted-foreground">⭐⭐⭐⭐⭐</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Harika bir deneyimdi. Hocam çok ilgili ve yardımcıydı. Kesinlikle tavsiye ederim.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
