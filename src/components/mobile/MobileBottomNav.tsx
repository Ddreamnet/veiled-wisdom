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
} from "lucide-react";
import { TurkishLiraIcon } from "@/components/icons/TurkishLiraIcon";
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
    // Admin navigation - NO Home, NO Messages in bottom nav
    if (role === "admin") {
      return [
        { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
        { icon: CheckCircle, label: "Onaylar", href: "/admin/approvals" },
        { icon: TurkishLiraIcon, label: "Gelirler", href: "/admin/earnings" },
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
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Full-width bottom bar - docked to bottom */}
      <div className="bg-background-elevated/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
        <div
          className="flex items-center justify-around px-2"
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
                  "relative flex flex-col items-center justify-center transition-all duration-200",
                  "min-w-[56px] min-h-[48px] py-1.5 px-2 rounded-xl",
                  active && "bg-primary/15",
                  isPressed && "scale-95 opacity-80",
                )}
              >
                {/* Icon with glow effect when active */}
                <div className={cn(
                  "relative transition-transform duration-200",
                  active && "scale-110"
                )}>
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      active ? "text-primary" : "text-silver-muted",
                    )}
                  />
                  {/* Subtle glow behind active icon */}
                  {active && (
                    <div className="absolute inset-0 blur-md bg-primary/40 -z-10" />
                  )}
                </div>

                {/* Label - always visible, highlighted when active */}
                <span className={cn(
                  "mt-1 text-[10px] font-medium transition-colors duration-200",
                  active ? "text-primary" : "text-silver-muted"
                )}>
                  {item.label}
                </span>

                {/* Badge for unread messages - only show when count > 0 */}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute top-0 right-0.5 h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[10px]"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
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
