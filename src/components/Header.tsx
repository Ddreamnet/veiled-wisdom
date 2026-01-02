import { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.webp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  Settings,
  MessageSquare,
  BookOpen,
  DollarSign,
} from "lucide-react";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";

const HeaderComponent = () => {
  const { user, role, signOut } = useAuth();
  const scrollPosition = useScrollPosition();
  const isScrolled = scrollPosition > 20;
  const { unreadCount } = useUnreadCount();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch user avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) {
        setAvatarUrl(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setAvatarUrl(data?.avatar_url || null);
    };
    fetchAvatar();
  }, [user]);

  // Navigation items based on role
  const getCenterNavItems = () => {
    if (role === "admin") {
      return [
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Onaylamalar", href: "/admin/approvals" },
        { label: "Gelirler", href: "/admin/earnings" },
      ];
    }
    // For non-logged-in users, customers, and teachers
    return [
      { label: "Keşfet", href: "/explore" },
      { label: "Uzmanlarımız", href: "/experts" },
    ];
  };

  const centerNavItems = getCenterNavItems();

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ease-out will-change-transform hidden md:block ${
        isScrolled 
          ? "backdrop-blur-xl bg-background/95 border-silver/20 shadow-lg" 
          : "backdrop-blur-md bg-background/80 border-silver/10 shadow-sm"
      }`}
      style={{ transform: 'translateZ(0)' }}
    >
      <div className="container mx-auto px-4">
        <div
          className={`flex items-center justify-between transition-all duration-300 ease-out ${
            isScrolled ? "h-14" : "h-16"
          }`}
        >
          {/* LEFT AREA - Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative will-change-transform">
              <img
                src={logo}
                alt="Leyl"
                loading="eager"
                fetchPriority="high"
                className={`transition-all duration-300 ease-out group-hover:scale-105 ${
                  isScrolled ? "h-8 w-8" : "h-10 w-10"
                }`}
                style={{ transform: 'translateZ(0)' }}
              />
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span
                className={`font-serif font-bold text-gradient-silver transition-all duration-300 ease-out uppercase ${
                  isScrolled ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                }`}
              >
                LEYL
              </span>
              <span
                className={`text-xs text-silver-muted transition-all duration-300 ease-out hidden sm:block ${
                  isScrolled ? "opacity-0 max-h-0" : "opacity-100 max-h-4"
                }`}
              >
                Gizli İlimler Platformu
              </span>
            </div>
          </Link>

          {/* CENTER AREA - Main Navigation (Desktop/Tablet) */}
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative transition-all duration-200 ease-out"
                    >
                      <MessageSquare className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}

                {/* Profile Avatar Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full h-9 w-9 p-0 transition-all duration-200 ease-out hover:ring-2 hover:ring-primary/50"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/20">
                          <User className="h-4 w-4 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 glass-effect border-silver/20 bg-background/95 backdrop-blur-xl z-[100]"
                  >
                    {/* Common items for all logged-in users */}
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Profil
                      </Link>
                    </DropdownMenuItem>

                    {/* Teacher-specific items */}
                    {role === "teacher" && (
                      <>
                        <DropdownMenuSeparator className="bg-silver/10" />
                        <DropdownMenuItem asChild>
                          <Link to="/teacher/my-listings" className="flex items-center gap-2 cursor-pointer">
                            <BookOpen className="h-4 w-4" />
                            İlanlarım
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/teacher/earnings" className="flex items-center gap-2 cursor-pointer">
                            <DollarSign className="h-4 w-4" />
                            Gelirlerim
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Settings - Only for non-admin users */}
                    {role !== "admin" && (
                      <>
                        <DropdownMenuSeparator className="bg-silver/10" />
                        <DropdownMenuItem asChild>
                          <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                            <Settings className="h-4 w-4" />
                            Ayarlar
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator className="bg-silver/10" />
                    
                    <DropdownMenuItem
                      onClick={signOut}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
