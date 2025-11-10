import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Category, Curiosity } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Sparkles, BookOpen, Users } from 'lucide-react';

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
      <section className="relative liquid-gradient py-32 overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-silver/20 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-silver-muted">Gizli İlimler ve Antik Bilgelik</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-serif font-bold text-smoky leading-tight">
              Leyl
            </h1>
            <p className="text-3xl md:text-4xl font-serif text-gradient-silver">
              Gizli İlimler Platformu
            </p>
            
            <p className="text-xl text-silver-muted max-w-2xl mx-auto leading-relaxed">
              Antik bilgelik ve modern yaklaşımın buluştuğu platform. 
              Uzman hocalarımızla tanışın ve bilgelik yolculuğunuza başlayın.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/explore">
                <Button size="lg" className="w-full sm:w-auto">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Keşfet
                </Button>
              </Link>
              <Link to="/auth/sign-up">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Users className="w-5 h-5 mr-2" />
                  Kayıt Ol
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '4s' }} />
        </div>
      </section>

      {/* Curiosities Section */}
      <section className="container py-24">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-serif font-bold text-gradient-silver mb-2">Merak Konuları</h2>
            <p className="text-silver-muted">Gizemli konuları keşfedin</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {curiosities.map((curiosity) => (
            <Card key={curiosity.id} className="group overflow-hidden">
              {curiosity.cover_url && (
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={curiosity.cover_url}
                    alt={curiosity.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl text-silver group-hover:text-gradient-purple transition-all">
                  {curiosity.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-silver-muted mb-6 line-clamp-3">
                  {curiosity.content.substring(0, 120)}...
                </p>
                <Link to={`/curiosities/${curiosity.slug}`}>
                  <Button variant="ghost" size="sm" className="w-full group/btn">
                    Yazıyı İnceleyin 
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="container py-24">
        <div className="mb-12">
          <h2 className="text-4xl font-serif font-bold text-gradient-silver mb-2">Kategoriler</h2>
          <p className="text-silver-muted">Uzmanlık alanlarını keşfedin</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                  <h3 className="font-semibold text-lg text-silver group-hover:text-gradient-purple transition-all mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-silver-muted">Aktif ilanları keşfedin</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold text-gradient-silver mb-2">Kullanıcı Yorumları</h2>
          <p className="text-silver-muted">Deneyimlerini keşfedin</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-effect">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-purple flex items-center justify-center text-white font-semibold text-xl shadow-glow-sm">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-silver">Kullanıcı {i}</p>
                    <p className="text-sm text-primary flex items-center gap-1">
                      {[...Array(5)].map((_, idx) => (
                        <span key={idx}>⭐</span>
                      ))}
                    </p>
                  </div>
                </div>
                <p className="text-silver-muted italic leading-relaxed">
                  "Harika bir deneyimdi. Hocam çok ilgili ve yardımcıydı. Kesinlikle tavsiye ederim."
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
