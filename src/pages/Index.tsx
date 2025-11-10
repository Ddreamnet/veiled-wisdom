import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Category, Curiosity } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Sparkles, Star } from 'lucide-react';

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
      {/* Hero Section with Liquid Gradient */}
      <section className="relative liquid-gradient overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container relative z-10 py-32 md:py-40">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect mb-8 animate-scale-in">
              <Sparkles className="h-4 w-4 text-primary-glow" />
              <span className="text-sm font-medium text-foreground">Gizli İlimler Platformu</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight">
              <span className="text-gradient">Leyl</span>
              <br />
              <span className="text-foreground">Bilgelik Yolculuğu</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Antik bilgelik ve modern yaklaşımın buluştuğu platform. Uzman hocalarımızla tanışın ve yolculuğunuza başlayın.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/explore">
                <Button size="lg" className="w-full sm:w-auto group">
                  Keşfet
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/auth/sign-up">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Kayıt Ol
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Curiosities Section */}
      <section className="container py-24">
        <div className="flex items-center justify-between mb-12 animate-slide-in">
          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-2">Merak Konuları</h2>
            <p className="text-muted-foreground">Bilgelik kapılarını aralayın</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {curiosities.map((curiosity, index) => (
            <Card 
              key={curiosity.id} 
              className="group hover:shadow-glow hover:-translate-y-1 animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="p-0">
                {curiosity.cover_url && (
                  <div className="relative overflow-hidden rounded-t-2xl">
                    <img
                      src={curiosity.cover_url}
                      alt={curiosity.title}
                      className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <CardTitle className="mb-3 text-xl font-serif">{curiosity.title}</CardTitle>
                <p className="text-muted-foreground mb-6 line-clamp-2">
                  {curiosity.content.substring(0, 100)}...
                </p>
                <Link to={`/curiosities/${curiosity.slug}`}>
                  <Button variant="ghost" size="sm" className="group/btn">
                    Yazıyı inceleyin
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="container py-24 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        
        <div className="mb-12 animate-slide-in">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-2">Kategoriler</h2>
          <p className="text-muted-foreground">İlgi alanınıza göre keşfedin</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <Link 
              key={category.id} 
              to={`/categories/${category.slug}`}
              className="group animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Card className="h-full hover:shadow-glow hover:-translate-y-1 overflow-hidden">
                {category.image_url && (
                  <div className="relative overflow-hidden">
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-serif font-semibold text-xl text-foreground">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                )}
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary-glow" />
                    Aktif ilanları keşfedin
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="container py-24">
        <div className="text-center mb-12 animate-slide-in">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-2">Kullanıcı Yorumları</h2>
          <p className="text-muted-foreground">Deneyimlerini paylaşanlar</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card 
              key={i} 
              className="hover:shadow-glow-sm transition-smooth animate-scale-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center mr-4 shadow-glow-sm">
                    <span className="text-2xl">✨</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Kullanıcı {i}</p>
                    <div className="flex gap-1 mt-1">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-primary-glow text-primary-glow" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
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
