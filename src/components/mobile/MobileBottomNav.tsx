import { memo, useState, useRef, useEffect, useLayoutEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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

interface PillPosition {
  left: number;
  width: number;
}

const MobileBottomNavComponent = () => {
  const { user, role } = useAuth();
  const location = useLocation();
  const { unreadCount } = useUnreadCount();
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const [pillPosition, setPillPosition] = useState<PillPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

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

  // Find the best matching nav item for current path
  // Priority: exact match > startsWith match > fallback parent route
  const findActiveHref = (): string | undefined => {
    const pathname = location.pathname;
    
    // First, check for exact match
    const exactMatch = navItems.find(item => item.href === pathname);
    if (exactMatch) return exactMatch.href;
    
    // Second, check for startsWith match (but not "/" which would match everything)
    const startsWithMatch = navItems.find(item => 
      item.href !== "/" && pathname.startsWith(item.href)
    );
    if (startsWithMatch) return startsWithMatch.href;
    
    // Third, if we're on a page not in navbar, find the most likely parent
    // For admin: /messages should highlight /profile (since they access it from profile menu)
    // For other users: /messages is in navbar, so this won't apply
    const parentRouteMap: Record<string, string> = {
      "/messages": "/profile",
      "/settings": "/profile",
    };
    
    for (const [childRoute, parentRoute] of Object.entries(parentRouteMap)) {
      if (pathname.startsWith(childRoute)) {
        const parentItem = navItems.find(item => item.href === parentRoute);
        if (parentItem) return parentItem.href;
      }
    }
    
    // Check if it's the home page
    if (pathname === "/") {
      const homeItem = navItems.find(item => item.href === "/");
      if (homeItem) return homeItem.href;
    }
    
    return undefined;
  };

  const activeHref = findActiveHref();

  const isActive = (href: string) => {
    return activeHref === href;
  };

  // Calculate pill position based on active item
  useLayoutEffect(() => {
    // If no active item in current nav, hide the pill
    if (!activeHref || !containerRef.current) {
      setPillPosition(null);
      return;
    }

    const activeElement = itemRefs.current.get(activeHref);
    if (!activeElement) {
      setPillPosition(null);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    setPillPosition({
      left: activeRect.left - containerRect.left,
      width: activeRect.width,
    });
  }, [activeHref, navItems.length]);

  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => {
      if (!activeHref || !containerRef.current) {
        setPillPosition(null);
        return;
      }

      const activeElement = itemRefs.current.get(activeHref);
      if (!activeElement) {
        setPillPosition(null);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();

      setPillPosition({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeHref]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Full-width bottom bar - docked to bottom */}
      <div className="bg-background-elevated/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
        <div
          ref={containerRef}
          className="relative flex items-center justify-around px-3"
          style={{ minHeight: "68px" }}
        >
          {/* Sliding pill background */}
          <AnimatePresence>
            {pillPosition && (
              <motion.div
                layoutId="nav-pill"
                className="absolute bg-primary/20 border border-primary/30 rounded-full top-1/2"
                initial={false}
                animate={{
                  left: pillPosition.left,
                  width: pillPosition.width,
                  height: 44,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
                style={{ marginTop: -22 }}
              />
            )}
          </AnimatePresence>

          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const isPressed = pressedItem === item.href;

            return (
              <Link
                key={item.href}
                ref={(el) => {
                  if (el) itemRefs.current.set(item.href, el);
                }}
                to={item.href}
                onTouchStart={() => setPressedItem(item.href)}
                onTouchEnd={() => setPressedItem(null)}
                onMouseDown={() => setPressedItem(item.href)}
                onMouseUp={() => setPressedItem(null)}
                onMouseLeave={() => setPressedItem(null)}
                className={cn(
                  "relative z-10 flex items-center justify-center transition-all duration-300 ease-out",
                  "min-h-[48px] rounded-full",
                  // Active state: horizontal pill with icon + label side by side
                  active 
                    ? "px-4 py-2 gap-2" 
                    : "flex-col px-3 py-2 min-w-[52px]",
                  isPressed && "scale-95 opacity-80",
                )}
              >
                {/* Icon */}
                <motion.div 
                  className="relative"
                  animate={{ scale: active ? 1.05 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      active ? "text-primary" : "text-silver-muted",
                    )}
                  />
                  {/* Subtle glow behind active icon */}
                  {active && (
                    <motion.div 
                      className="absolute inset-0 blur-lg bg-primary/50 -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </motion.div>

                {/* Label - position changes based on active state */}
                <motion.span 
                  className={cn(
                    "font-medium whitespace-nowrap",
                    active 
                      ? "text-sm text-primary" 
                      : "text-[10px] text-silver-muted mt-1"
                  )}
                  layout
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>

                {/* Badge for unread messages */}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className={cn(
                      "h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[10px]",
                      active 
                        ? "ml-1" 
                        : "absolute -top-0.5 -right-0.5"
                    )}
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
