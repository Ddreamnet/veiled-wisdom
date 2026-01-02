import { memo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { 
  Home, 
  Compass, 
  MessageSquare, 
  Calendar, 
  User, 
  LogIn,
  LayoutDashboard,
  CheckCircle,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const MobileBottomNavComponent = () => {
  const { user, role } = useAuth();
  const location = useLocation();
  const { unreadCount } = useUnreadCount();
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  // Get navigation items based on role
  const getNavItems = (): NavItem[] => {
    // Admin navigation
    if (role === "admin") {
      return [
        { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
        { icon: CheckCircle, label: "Onaylar", href: "/admin/approvals" },
        { icon: DollarSign, label: "Gelirler", href: "/admin/earnings" },
        { icon: User, label: "Profil", href: "/profile" },
      ];
    }

    // Logged-in users (Danışan & Uzman)
    if (user) {
      return [
        { icon: Home, label: "Ana Sayfa", href: "/" },
        { icon: Compass, label: "Keşfet", href: "/explore" },
        { icon: MessageSquare, label: "Mesajlar", href: "/messages", badge: unreadCount },
        { icon: Calendar, label: "Randevular", href: "/appointments" },
        { icon: User, label: "Profil", href: "/profile" },
      ];
    }

    // Non-logged-in users
    return [
      { icon: Home, label: "Ana Sayfa", href: "/" },
      { icon: Compass, label: "Keşfet", href: "/explore" },
      { icon: LogIn, label: "Giriş", href: "/auth/sign-in" },
    ];
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Floating pill container */}
      <div className="mx-4 mb-3 pointer-events-auto">
        <div 
          className="glass-effect rounded-full px-2 py-2 flex items-center justify-around shadow-elegant border border-silver/10"
          style={{ minHeight: "64px" }}
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const isPressed = pressedItem === item.href;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onTouchStart={() => setPressedItem(item.href)}
                onTouchEnd={() => setPressedItem(null)}
                onMouseDown={() => setPressedItem(item.href)}
                onMouseUp={() => setPressedItem(null)}
                onMouseLeave={() => setPressedItem(null)}
                className={cn(
                  "relative flex items-center justify-center transition-all duration-300 ease-out",
                  "min-w-[44px] min-h-[44px]",
                  active 
                    ? "px-4 py-2 rounded-full bg-primary/20 border border-primary/30" 
                    : "px-3 py-2",
                  isPressed && "scale-90 opacity-80"
                )}
              >
                {/* Icon */}
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    active ? "text-primary" : "text-silver-muted"
                  )} 
                />
                
                {/* Active label - only shown when active */}
                {active && (
                  <span className="ml-2 text-sm font-medium text-primary whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                
                {/* Badge for unread messages */}
                {item.badge && item.badge > 0 && !active && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
                
                {/* Badge shown differently when active */}
                {item.badge && item.badge > 0 && active && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export const MobileBottomNav = memo(MobileBottomNavComponent);
