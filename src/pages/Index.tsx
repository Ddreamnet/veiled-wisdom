import { useMemo, lazy, Suspense, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowLeft, BookOpen, Users, ChevronLeft, ChevronRight, User } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useMousePosition } from "@/hooks/useMousePosition";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeData, useAllListings } from "@/lib/queries";
import { getOptimizedThumbnailUrl, getOptimizedCoverUrl, getOptimizedAvatarUrl } from "@/lib/imageOptimizer";
import { ExpertsCarousel } from "@/components/ExpertsCarousel";
import logoImage from "@/assets/logo.webp";
import { Category } from "@/lib/supabase";

// Lazy load ParticleBackground - it's heavy and not critical
const ParticleBackground = lazy(() => import("@/components/ParticleBackground").then(m => ({
  default: m.ParticleBackground
})));

// Categories Carousel Component
function CategoriesCarousel({
  categories,
  isLoading
}: {
  categories: Category[];
  isLoading: boolean;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    skipSnaps: false,
    dragFree: true
  });
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Desktop'ta tüm kartlar ekrana sığarsa Embla kaydırma alanı oluşmaz ve loop çalışmaz.
  // Bu yüzden gerektiğinde kategorileri çoğaltıp her breakpoint'te overflow garanti ediyoruz.
  const loopSlides = useMemo(() => {
    if (!categories?.length) return [] as Category[];

    // 4'lü desktop görünümünde bile kaydırma olabilmesi için en az 8 slide hedefliyoruz.
    const targetMin = 8;
    let result = categories.slice();
    while (result.length < targetMin) result = result.concat(categories);
    return result;
  }, [categories]);
  return <section className="container py-12 md:py-16 lg:py-24 px-4">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-2 uppercase">KATEGORİLER</h2>
        <p className="text-sm md:text-base text-silver-muted">Uzmanlık Alanlarını Keşfedin! 🌼🤍🌕</p>
      </div>

      {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {[1, 2, 3, 4].map(i => <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 sm:h-44 md:h-48 w-full" />
              <CardContent className="p-4 sm:p-5 md:p-6 pb-[12px]">
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>)}
        </div> : <div className="relative">
          {/* Navigation Buttons */}
          <Button variant="outline" size="icon" onClick={scrollPrev} className="hidden md:flex absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 shadow-elegant">
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Previous</span>
          </Button>

          <Button variant="outline" size="icon" onClick={scrollNext} className="hidden md:flex absolute -right-4 lg:-right-6 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 shadow-elegant">
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Next</span>
          </Button>

          {/* Carousel Container */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y -ml-4">
              {loopSlides.map((category, idx) => <div key={`${category.id}-${idx}`} className="flex-[0_0_80%] sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_24%] min-w-0 pl-4">
                  <Link to={`/categories/${category.slug}`}>
                    <Card className="group overflow-hidden h-full card-hover">
                      {category.image_url && <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                          <img src={getOptimizedThumbnailUrl(category.image_url)} alt={category.name} loading="lazy" decoding="async" className="w-full h-full object-cover card-image" />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/50 to-transparent" />
                        </div>}
                      <CardContent className="px-3 py-2 min-h-[48px] flex items-center">
                        <h3 className="font-semibold text-base sm:text-lg text-silver group-hover:text-gradient-purple transition-all font-serif">
                          {category.name.toLocaleUpperCase("tr-TR")}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                </div>)}
            </div>
          </div>
        </div>}
    </section>;
}
export default function Index() {
  const {
    data,
    isLoading
  } = useHomeData();
  const { data: previewListings, isLoading: listingsLoading } = useAllListings(4);
  const categories = data?.categories || [];
  const curiosities = data?.curiosities || [];
  const mousePosition = useMousePosition();
  const scrollPosition = useScrollPosition();
  const {
    user
  } = useAuth();

  // Calculate parallax values (memoized for performance)
  const parallaxY = useMemo(() => scrollPosition * 0.5, [scrollPosition]);
  const parallaxScale = useMemo(() => 1 + scrollPosition * 0.0002, [scrollPosition]);
  const decorativeParallax1 = useMemo(() => parallaxY * 0.3, [parallaxY]);
  const decorativeParallax2 = useMemo(() => parallaxY * 0.5, [parallaxY]);
  return <div className="min-h-screen">
      {/* Hero Section with Liquid Gradient */}
      <section className="relative liquid-gradient py-16 md:py-24 lg:py-32 overflow-hidden">
        {/* Particle Background - Lazy loaded */}
        <Suspense fallback={null}>
          <ParticleBackground />
        </Suspense>

        {/* Mouse-following Glow */}
        <div className="absolute w-96 h-96 rounded-full pointer-events-none" style={{
        background: `radial-gradient(circle, hsl(280 90% 70% / 0.15) 0%, transparent 70%)`,
        left: `${mousePosition.x}px`,
        top: `${mousePosition.y}px`,
        transform: `translate3d(-50%, -50%, 0)`,
        filter: "blur(60px)",
        willChange: "transform"
      }} />

        <div className="container relative z-10" style={{
        transform: `translate3d(0, -${parallaxY}px, 0) scale(${parallaxScale})`,
        willChange: "transform"
      }}>
          <div className="text-center space-y-6 md:space-y-8 animate-fade-in-up px-4">
            <div className="flex justify-center mb-2 md:mb-4">
              <img src={logoImage} alt="Leyl Logo" className="h-16 md:h-24 lg:h-28 w-auto object-contain" />
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-smoky leading-tight uppercase">LEYL</h1>
            <p className="text-2xl md:text-3xl lg:text-4xl font-serif text-gradient-silver uppercase">GİZLİ İLİMLER PLATFORMU</p>

            <p className="text-base md:text-lg lg:text-xl text-silver-muted leading-relaxed max-w-3xl mx-auto">
              Antik bilgelik ve modern yaklaşımın buluştuğu platform. Uzmanlarımızla tanışın ve bilgelik yolculuğunuza
              başlayın.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-4">
              
              {!user}
            </div>
          </div>
        </div>

        {/* Decorative Elements with Parallax */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" style={{
          transform: `translate3d(0, ${decorativeParallax1}px, 0)`,
          willChange: "transform"
        }} />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-glow-pulse" style={{
          animationDelay: "4s",
          transform: `translate3d(0, ${decorativeParallax2}px, 0)`,
          willChange: "transform"
        }} />
        </div>

        {/* Seamless Transition Overlay - Particle'ların üstüne, Hero'nun altında */}
        <div
          className="pointer-events-none absolute left-0 right-0 bottom-0 z-20 h-48 md:h-56"
          style={{
            background: 'linear-gradient(to bottom, rgba(19, 2, 30, 0) 0%, rgba(19, 2, 30, 1) 100%)',
          }}
          aria-hidden="true"
        />
      </section>

      {/* Categories Section */}
      <CategoriesCarousel categories={categories} isLoading={isLoading} />

      {/* All Listings Preview Section */}
      <section className="container py-12 md:py-16 lg:py-24 px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-2 uppercase">TÜM İLANLAR</h2>
          <p className="text-sm md:text-base text-silver-muted">Uzmanlarımızın İlanlarını Keşfedin! 🌼🤍🌕</p>
        </div>

        {listingsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 sm:h-44 md:h-48 w-full" />
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <Skeleton className="h-5 w-28 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : previewListings && previewListings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {previewListings.map((listing) => (
                <Link key={listing.id} to={`/listings/${listing.id}`}>
                  <Card className="hover:shadow-glow transition-smooth h-full card-hover">
                    {listing.cover_url ? (
                      <img
                        src={getOptimizedThumbnailUrl(listing.cover_url)}
                        alt={listing.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-40 sm:h-44 md:h-48 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-40 sm:h-44 md:h-48 bg-primary/20 rounded-t-lg" />
                    )}
                    <CardContent className="p-4 sm:p-5 md:p-6">
                      <Link
                        to={`/profile/${listing.teacher_id}`}
                        className="flex items-center gap-2 mb-3 hover:opacity-80 transition-smooth w-fit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {listing.profiles.avatar_url ? (
                          <img
                            src={getOptimizedAvatarUrl(listing.profiles.avatar_url)}
                            alt={listing.profiles.username}
                            loading="lazy"
                            decoding="async"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {listing.profiles.username}
                        </span>
                      </Link>
                      <h3 className="font-semibold text-base sm:text-lg mb-2">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {listing.description}
                      </p>
                      {listing.minPrice && (
                        <p className="text-sm font-semibold text-primary">
                          {listing.minPrice} ₺'den başlayan fiyatlarla
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/listings">
                <Button variant="outline" size="lg" className="group">
                  Tümünü Gör
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground">Henüz ilan bulunmuyor.</p>
        )}
      </section>

      {/* Curiosities Section - Merak Konuları */}
      <section 
        id="merak-konulari" 
        className="relative py-12 md:py-16 lg:py-24 -mt-[1px]"
        style={{ backgroundColor: '#13021E' }}
      >
        <div className="container px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-2 uppercase">MERAK KONULARI</h2>
            <p className="text-sm md:text-base text-silver-muted">Gizemli Konuları Keşfedin! 🌼🤍🌕</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {isLoading ? [1, 2, 3].map(i => <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 sm:h-52 md:h-56 w-full" />
                    <CardHeader className="p-4 sm:p-5 md:p-6">
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>) : curiosities.map(curiosity => <Card key={curiosity.id} className="group overflow-hidden card-hover">
                    {curiosity.cover_url && <div className="relative h-48 sm:h-52 md:h-56 overflow-hidden">
                        <img src={getOptimizedCoverUrl(curiosity.cover_url)} alt={curiosity.title} loading="lazy" decoding="async" className="w-full h-full object-cover card-image" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                      </div>}
                    <CardHeader className="p-4 sm:p-5 md:p-6">
                      <CardTitle className="text-lg sm:text-xl text-silver group-hover:text-gradient-purple transition-all font-serif">
                        {curiosity.title.toLocaleUpperCase('tr-TR')}
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
                  </Card>)}
          </div>
        </div>
      </section>

      {/* Experts Carousel Section */}
      <ExpertsCarousel />
    </div>;
}