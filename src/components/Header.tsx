import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.webp";
import { MessageSquare } from "lucide-react";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { getCenterNavItems, UserDropdownMenu } from "@/components/header/index";

const HeaderComponent = () => {
  const { user, role, signOut } = useAuth();
  const { unreadCount } = useUnreadCount();

  // Threshold-based scroll detection — only re-renders when crossing the threshold
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 20);
  const isScrolledRef = useRef(isScrolled);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 20;
      if (scrolled !== isScrolledRef.current) {
        isScrolledRef.current = scrolled;
        setIsScrolled(scrolled);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cached avatar fetch via React Query
  const { data: avatarUrl } = useQuery({
    queryKey: ['header-avatar', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      return data?.avatar_url || null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const centerNavItems = getCenterNavItems(role);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-lg transition-[background-color,border-color,box-shadow] duration-300 ease-out hidden md:block ${
        isScrolled
          ? "bg-background/95 border-silver/20 shadow-lg"
          : "bg-background/80 border-silver/10 shadow-sm"
      }`}
      style={{ transform: "translateZ(0)" }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* LEFT AREA - Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative">
              <img
                src={logo}
                alt="Leyl"
                loading="eager"
                fetchPriority="high"
                className="h-9 w-9 group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-serif font-bold text-gradient-silver uppercase text-xl sm:text-2xl">
                LEYL
              </span>
              <span
                className={`text-xs text-silver-muted transition-opacity duration-300 hidden sm:block ${
                  isScrolled ? "opacity-0" : "opacity-100"
                }`}
              >
                Gizli İlimler Platformu
              </span>
            </div>
          </Link>

          {/* CENTER AREA - Main Navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1 gap-1">
            {centerNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* RIGHT AREA - Account & Personal Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <>
                {/* Messages Icon - Only for non-admin users */}
                {role !== "admin" && (
                  <Link to="/messages">
                    <Button variant="ghost" size="icon" className="relative transition-all duration-200 ease-out">
                      <MessageSquare className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}

                {/* Profile Avatar Dropdown */}
                <UserDropdownMenu avatarUrl={avatarUrl ?? null} role={role} onSignOut={signOut} />
              </>
            ) : (
              /* Non-logged-in users - Visible buttons */
              <div className="flex items-center gap-3">
                <Link to="/auth/sign-in">
                  <Button variant="secondary" size="sm" className="transition-all duration-200 ease-out">
                    Giriş Yap
                  </Button>
                </Link>
                <Link to="/auth/sign-up">
                  <Button size="sm" className="transition-all duration-200 ease-out">
                    Kayıt Ol
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu removed - using MobileBottomNav instead */}
        </div>
      </div>
    </header>
  );
};

export const Header = memo(HeaderComponent);
