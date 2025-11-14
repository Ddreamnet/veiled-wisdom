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

const HeaderComponent = () => {
  const { user, role, signOut } = useAuth();
  const scrollPosition = useScrollPosition();
  const isScrolled = scrollPosition > 50;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-50 w-full glass-effect border-b border-silver/10 shadow-elegant transition-all duration-500 ${
        isScrolled ? "backdrop-blur-xl bg-background/80" : "backdrop-blur-md bg-background/60"
      }`}
    >
      <div className="container mx-auto px-4">
        <div
          className={`flex items-center justify-between transition-all duration-500 ${isScrolled ? "h-14" : "h-16"}`}
        >
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src={logo}
                alt="Leyl"
                className={`transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                  isScrolled ? "h-8 w-8" : "h-10 w-10"
                }`}
              />
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <span
                className={`font-serif font-bold text-gradient-silver transition-all duration-500 ${
                  isScrolled ? "text-2xl" : "text-3xl"
                }`}
              >
                Leyl
              </span>
              <span
                className={`text-xs text-silver-muted transition-all duration-500 ${
                  isScrolled ? "opacity-0 h-0" : "opacity-100"
                }`}
              >
                Gizli İlimler Platformu
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-auto">
            {!user && (
              <>
                <Link
                  to="/explore"
                  className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                >
                  Keşfet
                </Link>
              </>
            )}

            {user && role === "customer" && (
              <>
                <Link
                  to="/explore"
                  className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                >
                  Keşfet
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="icon">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            )}

            {user && role === "teacher" && (
              <>
                <Link
                  to="/explore"
                  className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                >
                  Keşfet
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="icon">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            )}

            {user && role === "admin" && (
              <>
                <Link to="/admin/approvals">
                  <Button variant="ghost">Onaylamalar</Button>
                </Link>
                <Link to="/admin/earnings">
                  <Button variant="ghost">Gelirler</Button>
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Hesabım</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-effect border-silver/20">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>

                  {role === "customer" && (
                    <>
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

                  {role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
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
                  <Button variant="ghost" size="sm">
                    Giriş Yap
                  </Button>
                </Link>
                <Link to="/auth/sign-up">
                  <Button size="sm">Kayıt Ol</Button>
                </Link>
              </>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] glass-effect border-silver/20">
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
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        Ana Sayfa
                      </Link>
                      <Link
                        to="/explore"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        Keşfet
                      </Link>
                      <Link
                        to="/about"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        Hakkımızda
                      </Link>
                      <Link
                        to="/how-it-works"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        Nasıl Çalışır
                      </Link>
                      <Link
                        to="/contact"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        İletişim
                      </Link>

                      <div className="border-t border-silver/10 my-4" />

                      <Link to="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          Giriş Yap
                        </Button>
                      </Link>
                      <Link to="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full">Kayıt Ol</Button>
                      </Link>
                    </>
                  )}

                  {user && role === "customer" && (
                    <>
                      <Link
                        to="/explore"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        Keşfet
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <MessageSquare className="h-5 w-5" />
                        Mesajlar
                      </Link>
                      <Link
                        to="/appointments"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <Calendar className="h-5 w-5" />
                        Randevularım
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <Settings className="h-5 w-5" />
                        Profil
                      </Link>

                      <div className="border-t border-silver/10 my-4" />

                      <Button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive gap-3"
                      >
                        <LogOut className="h-5 w-5" />
                        Çıkış Yap
                      </Button>
                    </>
                  )}

                  {user && role === "teacher" && (
                    <>
                      <Link
                        to="/explore"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        Keşfet
                      </Link>
                      <Link
                        to="/teacher/my-listings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <BookOpen className="h-5 w-5" />
                        İlanlarım
                      </Link>
                      <Link
                        to="/appointments"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <Calendar className="h-5 w-5" />
                        Randevularım
                      </Link>
                      <Link
                        to="/teacher/earnings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <DollarSign className="h-5 w-5" />
                        Gelirlerim
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <MessageSquare className="h-5 w-5" />
                        Mesajlar
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <Settings className="h-5 w-5" />
                        Profil
                      </Link>

                      <div className="border-t border-silver/10 my-4" />

                      <Button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive gap-3"
                      >
                        <LogOut className="h-5 w-5" />
                        Çıkış Yap
                      </Button>
                    </>
                  )}

                  {user && role === "admin" && (
                    <>
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                      </Link>
                      <Link
                        to="/admin/approvals"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        Onaylamalar
                      </Link>
                      <Link
                        to="/admin/earnings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth text-left"
                      >
                        Gelirler
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth"
                      >
                        <Settings className="h-5 w-5" />
                        Profil
                      </Link>

                      <div className="border-t border-silver/10 my-4" />

                      <Button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive gap-3"
                      >
                        <LogOut className="h-5 w-5" />
                        Çıkış Yap
                      </Button>
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
