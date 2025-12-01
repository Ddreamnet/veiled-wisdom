import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  UserCircle,
  LogOut,
  Settings,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  BookOpen,
  DollarSign,
  Menu,
  X,
} from "lucide-react";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Badge } from "@/components/ui/badge";

const HeaderComponent = () => {
  const { user, role, signOut } = useAuth();
  const scrollPosition = useScrollPosition();
  const isScrolled = scrollPosition > 20;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { unreadCount } = useUnreadCount();

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ease-out will-change-transform ${
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
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative will-change-transform">
              <img
                src={logo}
                alt="Leyl"
                className={`transition-all duration-300 ease-out group-hover:scale-105 ${
                  isScrolled ? "h-8 w-8" : "h-10 w-10"
                }`}
                style={{ transform: 'translateZ(0)' }}
              />
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span
                className={`font-serif font-bold text-gradient-silver transition-all duration-300 ease-out ${
                  isScrolled ? "text-2xl" : "text-3xl"
                }`}
              >
                Leyl
              </span>
              <span
                className={`text-xs text-silver-muted transition-all duration-300 ease-out ${
                  isScrolled ? "opacity-0 max-h-0" : "opacity-100 max-h-4"
                }`}
              >
                Gizli İlimler Platformu
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-auto">
            {!user && (
              <Link
                to="/explore"
                className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
              >
                Keşfet
              </Link>
            )}

            {user && role === "customer" && (
              <>
                <Link
                  to="/explore"
                  className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                >
                  Keşfet
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="icon" className="relative transition-all duration-200 ease-out">
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
              </>
            )}

            {user && role === "teacher" && (
              <>
                <Link
                  to="/explore"
                  className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                >
                  Keşfet
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="icon" className="relative transition-all duration-200 ease-out">
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
              </>
            )}

            {user && role === "admin" && (
              <>
                <Link to="/admin/dashboard">
                  <Button variant="ghost" className="transition-all duration-200 ease-out">Dashboard</Button>
                </Link>
                <Link to="/admin/approvals">
                  <Button variant="ghost" className="transition-all duration-200 ease-out">Onaylamalar</Button>
                </Link>
                <Link to="/admin/earnings">
                  <Button variant="ghost" className="transition-all duration-200 ease-out">Gelirler</Button>
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-2 transition-all duration-200 ease-out">
                    <UserCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Hesabım</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 glass-effect border-silver/20 bg-background/95 backdrop-blur-xl z-[100]"
                >
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>

                  {role === "customer" && (
                    <>
                      <DropdownMenuSeparator className="bg-silver/10" />
                      <DropdownMenuItem asChild>
                        <Link to="/appointments" className="flex items-center gap-2 cursor-pointer">
                          <Calendar className="h-4 w-4" />
                          Randevularım
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

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
                        <Link to="/appointments" className="flex items-center gap-2 cursor-pointer">
                          <Calendar className="h-4 w-4" />
                          Randevularım
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
            ) : (
              <>
                <Link to="/auth/sign-in">
                  <Button variant="ghost" size="sm" className="transition-all duration-200 ease-out">
                    Giriş Yap
                  </Button>
                </Link>
                <Link to="/auth/sign-up">
                  <Button size="sm" className="transition-all duration-200 ease-out">Kayıt Ol</Button>
                </Link>
              </>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden transition-all duration-200 ease-out">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[300px] sm:w-[400px] glass-effect border-silver/20 bg-background/95 backdrop-blur-xl"
              >
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <img src={logo} alt="Leyl" className="h-8 w-8" />
                    <span className="font-serif text-gradient-silver">Menü</span>
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col gap-4 mt-8">
                  {!user && (
                    <>
                      <Link
                        to="/"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out text-left"
                      >
                        Ana Sayfa
                      </Link>
                      <Link
                        to="/explore"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out text-left"
                      >
                        Keşfet
                      </Link>
                      <Link
                        to="/about"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out text-left"
                      >
                        Hakkımızda
                      </Link>
                      <Link
                        to="/how-it-works"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out text-left"
                      >
                        Nasıl Çalışır
                      </Link>
                      <Link
                        to="/contact"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out text-left"
                      >
                        İletişim
                      </Link>

                      <div className="border-t border-silver/10 my-4" />

                      <Link to="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start transition-all duration-200 ease-out">
                          Giriş Yap
                        </Button>
                      </Link>
                      <Link to="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full transition-all duration-200 ease-out">Kayıt Ol</Button>
                      </Link>
                    </>
                  )}

                  {user && role === "customer" && (
                    <>
                      <Link
                        to="/explore"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out text-left"
                      >
                        Keşfet
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        <MessageSquare className="h-5 w-5" />
                        Mesajlar
                        {unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="ml-auto h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </Link>
                      <Link
                        to="/appointments"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        <Calendar className="h-5 w-5" />
                        Randevularım
                      </Link>
                    </>
                  )}

                  {user && role === "teacher" && (
                    <>
                      <Link
                        to="/explore"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out text-left"
                      >
                        Keşfet
                      </Link>
                      <Link
                        to="/teacher/my-listings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        <BookOpen className="h-5 w-5" />
                        İlanlarım
                      </Link>
                      <Link
                        to="/appointments"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        <Calendar className="h-5 w-5" />
                        Randevularım
                      </Link>
                      <Link
                        to="/teacher/earnings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        <DollarSign className="h-5 w-5" />
                        Gelirlerim
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        <MessageSquare className="h-5 w-5" />
                        Mesajlar
                        {unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="ml-auto h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </Link>
                    </>
                  )}

                  {user && role === "admin" && (
                    <>
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                      </Link>
                      <Link
                        to="/admin/approvals"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        Onaylamalar
                      </Link>
                      <Link
                        to="/admin/earnings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-all duration-200 ease-out"
                      >
                        Gelirler
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export const Header = memo(HeaderComponent);
