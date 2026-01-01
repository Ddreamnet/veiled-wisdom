import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { User, Sparkles } from "lucide-react";
import { getOptimizedAvatarUrl } from "@/lib/imageOptimizer";

interface Expert {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const fetchApprovedExperts = async (): Promise<Expert[]> => {
  // Get all users with teacher role from user_roles table (same logic as admin panel)
  const { data: teacherRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "teacher");

  if (rolesError) throw rolesError;

  if (!teacherRoles || teacherRoles.length === 0) return [];

  const teacherIds = teacherRoles.map((r) => r.user_id);

  // Fetch profiles for these teachers
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .in("id", teacherIds);

  if (profilesError) throw profilesError;

  return profiles || [];
};

function ExpertCard({ expert }: { expert: Expert }) {
  const truncatedBio = expert.bio
    ? expert.bio.length > 50
      ? expert.bio.slice(0, 50) + "..."
      : expert.bio
    : "Uzman hakkında bilgi bulunmuyor.";

  return (
    <Link
      to={`/profile/${expert.id}`}
      className="group relative block"
    >
      {/* Card container with futuristic design */}
      <div className="relative mt-16 pt-20 pb-6 px-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-elegant transition-all duration-500 hover:shadow-glow hover:border-primary/40 hover:-translate-y-2 overflow-visible">
        {/* Animated border glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-4 w-8 h-0.5 bg-gradient-to-r from-primary/60 to-transparent" />
        <div className="absolute top-0 right-4 w-8 h-0.5 bg-gradient-to-l from-primary/60 to-transparent" />
        <div className="absolute bottom-0 left-4 w-8 h-0.5 bg-gradient-to-r from-primary/40 to-transparent" />
        <div className="absolute bottom-0 right-4 w-8 h-0.5 bg-gradient-to-l from-primary/40 to-transparent" />
        
        {/* Floating avatar - centered and overlapping */}
        <div className="absolute -top-14 left-1/2 -translate-x-1/2">
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-b from-primary/40 to-primary/10 blur-md group-hover:blur-lg transition-all duration-500 opacity-60 group-hover:opacity-100" />
            {/* Inner ring */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-b from-primary via-primary/50 to-transparent opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
            <Avatar className="relative h-28 w-28 border-4 border-background shadow-2xl ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-500">
              <AvatarImage
                src={getOptimizedAvatarUrl(expert.avatar_url, 112)}
                alt={expert.username || "Expert"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-2xl">
                <User className="h-12 w-12 text-primary" />
              </AvatarFallback>
            </Avatar>
            {/* Sparkle badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-glow-sm border-2 border-background">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center space-y-3">
          <h3 className="text-xl font-bold text-foreground group-hover:text-gradient-purple transition-all duration-300 font-serif tracking-wide">
            {expert.username || "Uzman"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {truncatedBio}
          </p>
          
          {/* Hover indicator */}
          <div className="pt-3">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-primary/60 group-hover:text-primary transition-colors duration-300">
              <span className="w-4 h-px bg-primary/40 group-hover:w-8 transition-all duration-300" />
              Profili Görüntüle
              <span className="w-4 h-px bg-primary/40 group-hover:w-8 transition-all duration-300" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ExpertCardSkeleton() {
  return (
    <div className="relative mt-16 pt-20 pb-6 px-6 rounded-2xl border border-primary/10 bg-card">
      {/* Avatar skeleton */}
      <div className="absolute -top-14 left-1/2 -translate-x-1/2">
        <Skeleton className="h-28 w-28 rounded-full" />
      </div>
      <div className="text-center space-y-3">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </div>
    </div>
  );
}

export default function Experts() {
  const { data: experts = [], isLoading, error } = useQuery({
    queryKey: ["approved-experts"],
    queryFn: fetchApprovedExperts,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen liquid-gradient">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 max-w-7xl">
        <PageBreadcrumb customItems={[{ label: "Uzmanlarımız" }]} />

        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Onaylı Uzmanlar</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gradient-silver font-serif">
            Uzmanlarımız
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Alanında uzman, deneyimli ve onaylı danışmanlarımızla tanışın
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Uzmanlar yüklenirken bir hata oluştu.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <ExpertCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Experts Grid */}
        {!isLoading && !error && experts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {experts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && experts.length === 0 && (
          <div className="text-center py-16 sm:py-24 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Henüz onaylı uzman bulunmuyor
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Yakında uzmanlarımız bu sayfada yer alacak.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
