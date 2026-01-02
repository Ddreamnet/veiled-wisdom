import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, User, Sparkles, Users } from "lucide-react";
import { getOptimizedAvatarUrl } from "@/lib/imageOptimizer";
import { cn } from "@/lib/utils";

interface Expert {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const fetchApprovedExperts = async (): Promise<Expert[]> => {
  const { data: teacherRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "teacher");
    
  if (rolesError) throw rolesError;
  if (!teacherRoles || teacherRoles.length === 0) return [];
  
  const teacherIds = teacherRoles.map(r => r.user_id);
  
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .in("id", teacherIds)
    .limit(10); // Limit for performance on homepage
    
  if (profilesError) throw profilesError;
  return profiles || [];
};

function ExpertSlide({ expert, isActive }: { expert: Expert; isActive: boolean }) {
  const truncatedBio = expert.bio 
    ? expert.bio.length > 80 ? expert.bio.slice(0, 80) + "..." : expert.bio 
    : "Uzman hakkında bilgi bulunmuyor.";

  return (
    <Link 
      to={`/profile/${expert.id}`} 
      state={{ from: "experts" }} 
      className="block w-full"
    >
      <div 
        className={cn(
          "relative mx-auto transition-all duration-500 ease-out",
          isActive 
            ? "scale-100 opacity-100" 
            : "scale-90 opacity-50"
        )}
      >
        {/* Card container */}
        <div className={cn(
          "relative pt-16 pb-6 px-6 rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 transition-all duration-500",
          isActive 
            ? "border-primary/40 shadow-glow" 
            : "border-primary/10 shadow-elegant"
        )}>
          {/* Floating avatar */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className="relative">
              {/* Outer glow ring - only for active */}
              <div className={cn(
                "absolute -inset-2 rounded-full bg-gradient-to-b from-primary/40 to-primary/10 blur-md transition-all duration-500",
                isActive ? "opacity-80" : "opacity-30"
              )} />
              {/* Inner ring */}
              <div className={cn(
                "absolute -inset-1 rounded-full bg-gradient-to-b from-primary via-primary/50 to-transparent transition-opacity duration-500",
                isActive ? "opacity-60" : "opacity-20"
              )} />
              <Avatar className={cn(
                "relative h-24 w-24 border-4 border-background shadow-2xl ring-2 transition-all duration-500",
                isActive ? "ring-primary/50" : "ring-primary/20"
              )}>
                <AvatarImage 
                  src={getOptimizedAvatarUrl(expert.avatar_url, 96)} 
                  alt={expert.username || "Expert"} 
                  className="object-cover" 
                />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-xl">
                  <User className="h-10 w-10 text-primary" />
                </AvatarFallback>
              </Avatar>
              {/* Sparkle badge */}
              <div className={cn(
                "absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center border-2 border-background transition-all duration-500",
                isActive ? "shadow-glow-sm scale-100" : "shadow-none scale-90"
              )}>
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-center space-y-2">
            <h3 className={cn(
              "text-lg font-bold font-serif tracking-wide transition-all duration-300",
              isActive ? "text-gradient-purple" : "text-foreground"
            )}>
              {expert.username || "Uzman"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
              {truncatedBio}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ExpertSlideSkeleton() {
  return (
    <div className="relative pt-16 pb-6 px-6 rounded-2xl border border-primary/10 bg-card mx-auto max-w-xs">
      <div className="absolute -top-12 left-1/2 -translate-x-1/2">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
      <div className="text-center space-y-2">
        <Skeleton className="h-5 w-28 mx-auto" />
        <Skeleton className="h-4 w-40 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

export function ExpertsCarousel() {
  const { data: experts = [], isLoading, error } = useQuery({
    queryKey: ["homepage-experts"],
    queryFn: fetchApprovedExperts,
    staleTime: 5 * 60 * 1000,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: true,
    skipSnaps: false,
    containScroll: false,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Don't render section if no experts and not loading
  if (!isLoading && !error && experts.length === 0) {
    return null;
  }

  return (
    <section className="container py-12 md:py-16 lg:py-24 px-4">
      {/* Section Header */}
      <div className="text-center mb-8 md:mb-12">
        <Link to="/experts" className="inline-block group">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-silver mb-2 uppercase group-hover:text-gradient-purple transition-all">
            UZMANLARIMIZ
          </h2>
        </Link>
        <p className="text-sm md:text-base text-silver-muted">
          Alanında Uzman Danışmanlarla Tanışın! 🌼🤍🌕
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Uzmanlar yüklenirken bir hata oluştu.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center gap-4 py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-64 flex-shrink-0">
              <ExpertSlideSkeleton />
            </div>
          ))}
        </div>
      )}

      {/* Carousel */}
      {!isLoading && !error && experts.length > 0 && (
        <div className="relative">
          {/* Navigation Buttons - Desktop only */}
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className="hidden md:flex absolute left-0 lg:-left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 shadow-elegant"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className="hidden md:flex absolute right-0 lg:-right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 shadow-elegant"
          >
            <ArrowRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </Button>

          {/* Carousel Container */}
          <div className="overflow-hidden mx-8 md:mx-16" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {experts.map((expert, index) => (
                <div 
                  key={expert.id} 
                  className="flex-[0_0_80%] sm:flex-[0_0_50%] md:flex-[0_0_40%] lg:flex-[0_0_30%] min-w-0 pl-4"
                >
                  <div className="pt-14 pb-4">
                    <ExpertSlide 
                      expert={expert} 
                      isActive={index === selectedIndex}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {experts.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === selectedIndex 
                    ? "w-6 bg-primary" 
                    : "w-2 bg-primary/30 hover:bg-primary/50"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

    </section>
  );
}
