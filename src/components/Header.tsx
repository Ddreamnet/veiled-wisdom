import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, MessageSquare, DollarSign, Menu } from 'lucide-react';
import logo from '@/assets/logo.png';

export function Header() {
  const { user, role, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <img src={logo} alt="Leyl" className="h-10 w-10" />
          <span className="font-bold text-lg">Leyl</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          {!user && (
            <>
              <Link to="/explore" className="text-foreground hover:text-primary transition-smooth">
                Keşfet
              </Link>
              <Link to="/auth/sign-in">
                <Button variant="ghost">Giriş</Button>
              </Link>
              <Link to="/auth/sign-up">
                <Button>Kayıt ol</Button>
              </Link>
            </>
          )}

          {user && role === 'customer' && (
            <>
              <Link to="/messages">
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Hesabım</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/appointments">Randevularım</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Oturumu kapat</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {user && role === 'teacher' && (
            <>
              <Link to="/messages">
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/earnings">
                <Button variant="ghost" size="icon">
                  <DollarSign className="h-5 w-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Hesabım</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/appointments">Randevularım</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-listings">İlanlarım</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Oturumu kapat</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Hesabım</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Oturumu kapat</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </nav>

        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
