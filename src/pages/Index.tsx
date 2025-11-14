import { useEffect, useState, useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Category, Curiosity } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Sparkles, BookOpen, Users } from 'lucide-react';
import { ParticleBackground } from '@/components/ParticleBackground';
import { useMousePosition } from '@/hooks/useMousePosition';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useImagePreload } from '@/hooks/useImagePreload';

export default function Index() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [curiosities, setCuriosities] = useState<Curiosity[]>([]);
  const mousePosition = useMousePosition();
  const scrollPosition = useScrollPosition();

  // Preload images for better performance
  const imageUrls = useMemo(() => {
    return [
      ...categories.map(cat => cat.image_url).filter(Boolean),
      ...curiosities.map(cur => cur.cover_url).filter(Boolean),
    ] as string[];
  }, [categories, curiosities]);
  
  useImagePreload(imageUrls);

  const fetchData = useCallback(async () => {
    // Parallel fetch for better performance
    const [categoriesResult, curiositiesResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .limit(4),
      supabase
        .from('curiosities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    if (categoriesResult.data) setCategories(categoriesResult.data);
    if (curiositiesResult.data) setCuriosities(curiositiesResult.data);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate parallax values (memoized for performance)
  const parallaxY = useMemo(() => scrollPosition * 0.5, [scrollPosition]);
  const parallaxScale = useMemo(() => 1 + scrollPosition * 0.0002, [scrollPosition]);
  const decorativeParallax1 = useMemo(() => parallaxY * 0.3, [parallaxY]);
  const decorativeParallax2 = useMemo(() => parallaxY * 0.5, [parallaxY]);

  return (
    <div className="min-h-screen">
      {/* Hero Section with Liquid Gradient */}
      <section className="relative liquid-gradient py-16 md:py-24 lg:py-32 overflow-hidden">
        {/* Particle Background */}
        <ParticleBackground />
        
        {/* Mouse-following Glow */}
        <div
          className="absolute w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, hsl(280 90% 70% / 0.15) 0%, transparent 70%)`,
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: `translate3d(-50%, -50%, 0)`,
            filter: 'blur(60px)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="container relative z-10"
          style={{
            transform: `translate3d(0, -${parallaxY}px, 0) scale(${parallaxScale})`,
            willChange: 'transform',
          }}
        >
          <div className="text-center space-y-6 md:space-y-8 animate-fade-in-up px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full glass-effect border border-silver/20 mb-2 md:mb-4">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              <span className="text-xs md:text-sm text-silver-muted">Gizli İlimler ve Antik Bilgelik</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-smoky leading-tight">
              Leyl
            </h1>
            <p className="text-2xl md:text-3xl lg:text-4xl font-serif text-gradient-silver">
              Gizli İlimler Platformu
            </p>
            
            <p className="text-base md:text-lg lg:text-xl text-silver-muted leading-relaxed max-w-3xl mx-auto">
              Antik bilgelik ve modern yaklaşımın buluştuğu platform. 
              Uzman hocalarımızla tanışın ve bilgelik yolculuğunuza başlayın.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-4">
              <Link to="/explore" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  <BookOpen className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Keşfet
                </Button>
              </Link>
              <Link to="/auth/sign-up" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Users className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Kayıt Ol
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements with Parallax */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-glow-pulse"
            style={{
              transform: `translate3d(0, ${decorativeParallax1}px, 0)`,
              willChange: 'transform',
            }}
          />
          <div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-glow-pulse" 
            style={{ 
              animationDelay: '4s',
              transform: `translate3d(0, ${decorativeParallax2}px, 0)`,
              willChange: 'transform',
            }} 
          />
        </div>
      </section>

      {/* Curiosities Section */}
      <section className="container py-12 md:py-16 lg:py-24 px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-2">Merak Konuları</h2>
          <p className="text-sm md:text-base text-silver-muted">Gizemli konuları keşfedin</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {curiosities.map((curiosity) => (
            <Card key={curiosity.id} className="group overflow-hidden card-hover">
              {curiosity.cover_url && (
                <div className="relative h-48 sm:h-52 md:h-56 overflow-hidden">
                  <img
                    src={curiosity.cover_url}
                    alt={curiosity.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover card-image"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                </div>
              )}
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <CardTitle className="text-lg sm:text-xl text-silver group-hover:text-gradient-purple transition-all">
                  {curiosity.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
                <p className="text-sm sm:text-base text-silver-muted mb-4 sm:mb-6 line-clamp-3">
                  {curiosity.content.substring(0, 120)}...
                </p>
                <Link to={`/curiosities/${curiosity.slug}`}>
                  <Button variant="ghost" size="sm" className="w-full group/btn text-sm">
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
      <section className="container py-12 md:py-16 lg:py-24 px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-2">Kategoriler</h2>
          <p className="text-sm md:text-base text-silver-muted">Uzmanlık alanlarını keşfedin</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
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
                      className="w-full h-full object-cover card-image"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  </div>
                )}
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <h3 className="font-semibold text-base sm:text-lg text-silver group-hover:text-gradient-purple transition-all mb-2">
                    {category.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-silver-muted">Aktif ilanları keşfedin</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container py-12 md:py-16 lg:py-24 px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-2">Kullanıcı Yorumları</h2>
          <p className="text-sm md:text-base text-silver-muted">Deneyimlerini keşfedin</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-effect">
              <CardContent className="p-6 sm:p-7 md:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-purple flex items-center justify-center text-white font-semibold text-lg sm:text-xl shadow-glow-sm">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="font-semibold text-sm sm:text-base text-silver">Kullanıcı {i}</p>
                    <p className="text-xs sm:text-sm text-primary flex items-center gap-1">
                      {[...Array(5)].map((_, idx) => (
                        <span key={idx}>⭐</span>
                      ))}
                    </p>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-silver-muted italic leading-relaxed">
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
