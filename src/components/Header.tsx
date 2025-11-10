import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import logo from '@/assets/logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserCircle, LogOut, Settings, Calendar, MessageSquare, LayoutDashboard, BookOpen, DollarSign, Menu } from 'lucide-react';
import { useScrollPosition } from '@/hooks/useScrollPosition';

const HeaderComponent = () => {
  const { user, role, signOut } = useAuth();
  const scrollPosition = useScrollPosition();
  const isScrolled = scrollPosition > 50;

  return (
    <header className={`sticky top-0 z-50 w-full glass-effect border-b border-silver/10 shadow-elegant transition-all duration-500 ${
      isScrolled ? 'backdrop-blur-xl bg-background/80' : 'backdrop-blur-md bg-background/60'
    }`}>
      <div className="container mx-auto px-4">
        <div className={`flex items-center justify-between transition-all duration-500 ${
          isScrolled ? 'h-14' : 'h-16'
        }`}>
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src={logo} 
                alt="Leyl" 
                className={`transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                  isScrolled ? 'h-8 w-8' : 'h-10 w-10'
                }`} 
              />
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className={`font-serif font-bold text-gradient-silver transition-all duration-500 ${
              isScrolled ? 'text-xl' : 'text-2xl'
            }`}>Leyl</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {!user && (
              <>
                <Link to="/" className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth">
                  Ana Sayfa
                </Link>
                <Link to="/explore" className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth">
                  Keşfet
                </Link>
                <Link to="/about" className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth">
                  Hakkımızda
                </Link>
                <Link to="/how-it-works" className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth">
                  Nasıl Çalışır
                </Link>
                <Link to="/contact" className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth">
                  İletişim
                </Link>
              </>
            )}

            {user && role === 'customer' && (
              <>
                <Link to="/explore" className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth">
                  Keşfet
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="icon">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            )}

            {user && role === 'teacher' && (
              <>
                <Link to="/explore" className="px-4 py-2 rounded-xl text-silver-muted hover:text-silver hover:bg-secondary/50 transition-smooth">
                  Keşfet
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="icon">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/teacher/earnings">
                  <Button variant="ghost" size="icon">
                    <DollarSign className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            )}

            {user && role === 'admin' && (
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
                  
                  {role === 'customer' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/appointments" className="flex items-center gap-2 cursor-pointer">
                          <Calendar className="h-4 w-4" />
                          Randevularım
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {role === 'teacher' && (
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
                          Randevular
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="bg-silver/10" />
                  <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth/sign-in">
                  <Button variant="ghost" size="sm">Giriş Yap</Button>
                </Link>
                <Link to="/auth/sign-up">
                  <Button size="sm">Kayıt Ol</Button>
                </Link>
              </>
            )}
            
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export const Header = memo(HeaderComponent);
