import { useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BookOpen, Users } from "lucide-react";
import { useMousePosition } from "@/hooks/useMousePosition";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeData } from "@/lib/queries";
import { getOptimizedThumbnailUrl, getOptimizedCoverUrl } from "@/lib/imageOptimizer";
import logoImage from "@/assets/logo.png";

// Lazy load ParticleBackground - it's heavy and not critical
const ParticleBackground = lazy(() =>
  import("@/components/ParticleBackground").then((m) => ({ default: m.ParticleBackground })),
);

export default function Index() {
  const { data, isLoading } = useHomeData();
  const categories = data?.categories || [];
  const curiosities = data?.curiosities || [];

  const mousePosition = useMousePosition();
  const scrollPosition = useScrollPosition();
  const { user } = useAuth();

  // Calculate parallax values (memoized for performance)
  const parallaxY = useMemo(() => scrollPosition * 0.5, [scrollPosition]);
  const parallaxScale = useMemo(() => 1 + scrollPosition * 0.0002, [scrollPosition]);
  const decorativeParallax1 = useMemo(() => parallaxY * 0.3, [parallaxY]);
  const decorativeParallax2 = useMemo(() => parallaxY * 0.5, [parallaxY]);

  return (
    <div className="min-h-screen">
      {/* Hero Section with Liquid Gradient */}
      <section className="relative liquid-gradient py-16 md:py-24 lg:py-32 overflow-hidden">
        {/* Particle Background - Lazy loaded */}
        <Suspense fallback={null}>
          <ParticleBackground />
        </Suspense>

        {/* Mouse-following Glow */}
        <div
          className="absolute w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, hsl(280 90% 70% / 0.15) 0%, transparent 70%)`,
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: `translate3d(-50%, -50%, 0)`,
            filter: "blur(60px)",
            willChange: "transform",
          }}
        />

        <div
          className="container relative z-10"
          style={{
            transform: `translate3d(0, -${parallaxY}px, 0) scale(${parallaxScale})`,
            willChange: "transform",
          }}
        >
          <div className="text-center space-y-6 md:space-y-8 animate-fade-in-up px-4">
            <div className="flex justify-center mb-2 md:mb-4">
              <img src={logoImage} alt="Leyl Logo" className="h-16 md:h-24 lg:h-28 w-auto object-contain" />
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-smoky leading-tight">Leyl</h1>
            <p className="text-2xl md:text-3xl lg:text-4xl font-serif text-gradient-silver">Gizli İlimler Platformu</p>

            <p className="text-base md:text-lg lg:text-xl text-silver-muted leading-relaxed max-w-3xl mx-auto">
              Antik bilgelik ve modern yaklaşımın buluştuğu platform. Uzmanlarımızla tanışın ve bilgelik yolculuğunuza
              başlayın.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-4">
              <Link to="/explore" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  <BookOpen className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Keşfet
                </Button>
              </Link>
              {!user && (
                <Link to="/auth/sign-up" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    <Users className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Kayıt Ol
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Decorative Elements with Parallax */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-glow-pulse"
            style={{
              transform: `translate3d(0, ${decorativeParallax1}px, 0)`,
              willChange: "transform",
            }}
          />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-glow-pulse"
            style={{
              animationDelay: "4s",
              transform: `translate3d(0, ${decorativeParallax2}px, 0)`,
              willChange: "transform",
            }}
          />
        </div>
      </section>

      {/* Gradient Transition */}
      <div className="h-48 bg-gradient-to-b from-purple-950/40 via-purple-950/20 to-background" />

      {/* Curiosities Section */}
      <section className="container py-12 md:py-16 lg:py-24 px-4 -mt-32">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-2">Merak Konuları</h2>
          <p className="text-sm md:text-base text-silver-muted">Gizemli Konuları Keşfedin! 🌼🤍🌕</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {isLoading
            ? [1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 sm:h-52 md:h-56 w-full" />
                  <CardHeader className="p-4 sm:p-5 md:p-6">
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))
            : curiosities.map((curiosity) => (
                <Card key={curiosity.id} className="group overflow-hidden card-hover">
                  {curiosity.cover_url && (
                    <div className="relative h-48 sm:h-52 md:h-56 overflow-hidden">
                      <img
                        src={getOptimizedCoverUrl(curiosity.cover_url)}
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
          {isLoading
            ? [1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-40 sm:h-44 md:h-48 w-full" />
                  <CardContent className="p-4 sm:p-5 md:p-6 pb-[12px]">
                    <Skeleton className="h-6 w-24" />
                  </CardContent>
                </Card>
              ))
            : categories.map((category) => (
                <Link key={category.id} to={`/categories/${category.slug}`}>
                  <Card className="group overflow-hidden h-full card-hover">
                    {category.image_url && (
                      <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                        <img
                          src={getOptimizedThumbnailUrl(category.image_url)}
                          alt={category.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover card-image"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/50 to-transparent" />
                      </div>
                    )}
                    <CardContent className="p-4 sm:p-5 md:p-6 pb-[12px]">
                      <h3 className="font-semibold text-base sm:text-lg text-silver group-hover:text-gradient-purple transition-all mb-2">
                        {category.name}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>
      </section>
    </div>
  );
}
