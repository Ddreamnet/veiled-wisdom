import { memo, useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
  /** Additional route prefixes that should keep this tab active */
  matchPrefixes?: string[];
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

  // Keep this list comprehensive so we never briefly "lose" the active highlight on deep pages.
  // (This is what caused the flicker/jump when navigating between tabs from a deep route.)
  const navItems = useMemo<NavItem[]>(() => {
    const profileMatchPrefixes = [
      "/profile",
      "/settings",
      "/teacher",
      // Help / support pages
      "/how-it-works",
      "/faq",
      "/contact",
      // Other static pages frequently reached from profile/footer
      "/about",
      "/production",
      "/terms",
      "/privacy",
    ];

    const exploreMatchPrefixes = [
      "/explore",
      "/categories",
      "/curiosities",
      "/listings",
      "/experts",
      // Public profile pages are part of discovery
      "/profile/",
    ];

    const messagesMatchPrefixes = [
      "/messages",
      "/call",
    ];

    const appointmentsMatchPrefixes = [
      "/appointments",
    ];

    // Admin navigation - NO Home, NO Messages in bottom nav
    if (role === "admin") {
      return [
        { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard", matchPrefixes: ["/admin"] },
        { icon: CheckCircle, label: "Onaylar", href: "/admin/approvals", matchPrefixes: ["/admin/approvals"] },
        { icon: TurkishLiraIcon, label: "Gelirler", href: "/admin/earnings", matchPrefixes: ["/admin/earnings"] },
        {
          icon: User,
          label: "Profil",
          href: "/profile",
          // Admin reaches support messages through profile; keep profile highlighted on those pages.
          matchPrefixes: [...profileMatchPrefixes, ...messagesMatchPrefixes],
        },
      ];
    }

    // Logged-in users (Danışan & Uzman)
    if (user) {
      return [
        { icon: Home, label: "Ana Sayfa", href: "/", matchPrefixes: ["/"] },
        { icon: Compass, label: "Keşfet", href: "/explore", matchPrefixes: exploreMatchPrefixes },
        { icon: MessageSquare, label: "Mesajlar", href: "/messages", badge: unreadCount, matchPrefixes: messagesMatchPrefixes },
        { icon: Calendar, label: "Randevular", href: "/appointments", matchPrefixes: appointmentsMatchPrefixes },
        { icon: User, label: "Profil", href: "/profile", matchPrefixes: profileMatchPrefixes },
      ];
    }

    // Non-logged-in users
    return [
      { icon: Home, label: "Ana Sayfa", href: "/", matchPrefixes: ["/"] },
      { icon: Compass, label: "Keşfet", href: "/explore", matchPrefixes: exploreMatchPrefixes },
      { icon: LogIn, label: "Giriş", href: "/auth/sign-in", matchPrefixes: ["/auth"] },
    ];
  }, [role, user, unreadCount]);

  const getItemMatchLength = (item: NavItem, pathname: string): number => {
    const prefixes = item.matchPrefixes?.length
      ? item.matchPrefixes
      : [item.href];

    let best = 0;

    for (const prefix of prefixes) {
      if (!prefix) continue;

      // Special-case home: only exact match
      if (prefix === "/") {
        if (pathname === "/") best = Math.max(best, 1);
        continue;
      }

      // Exact or "under this tree" match
      if (pathname === prefix || pathname.startsWith(prefix)) {
        best = Math.max(best, prefix.length);
      }
    }

    return best;
  };

  // Pick the most specific matching tab (longest prefix wins)
  const activeHref = useMemo(() => {
    const pathname = location.pathname;
    let bestHref: string | undefined;
    let bestLen = 0;

    for (const item of navItems) {
      // Prefer the tab's full prefix list for matching, but return item.href as the stable identifier
      const len = getItemMatchLength(item, pathname);
      if (len > bestLen) {
        bestLen = len;
        bestHref = item.href;
      }
    }

    // If nothing matches (should be rare now), keep the previous position instead of unmounting the pill.
    return bestHref;
  }, [location.pathname, navItems]);

  const isActive = (href: string) => activeHref === href;

  const measurePill = () => {
    if (!activeHref || !containerRef.current) return;

    const activeElement = itemRefs.current.get(activeHref);
    if (!activeElement) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    setPillPosition({
      left: activeRect.left - containerRect.left,
      width: activeRect.width,
    });
  };

  // Calculate pill position based on active item.
  // We measure on the next frames so that:
  // - the active tab's layout (icon+label vs icon-only) has settled
  // - route changes that also change header/content height don't cause a "jump from top"
  useLayoutEffect(() => {
    if (!activeHref) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        measurePill();
      });
    });

    // Also re-measure when fonts finish loading (can affect widths on first open)
    const fontsReady = (document as any).fonts?.ready as Promise<void> | undefined;
    let cancelled = false;
    fontsReady?.then(() => {
      if (!cancelled) measurePill();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref, navItems.length]);

  // Recalculate on resize / container layout changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const ro = new ResizeObserver(() => {
      measurePill();
    });

    ro.observe(container);

    return () => {
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref]);

  // Also recalc when pressed state ends (because the item temporarily scales)
  useEffect(() => {
    if (!pressedItem) {
      // after releasing, wait a frame so scale resets
      const raf = window.requestAnimationFrame(() => measurePill());
      return () => window.cancelAnimationFrame(raf);
    }
  }, [pressedItem]);

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
          {/* Sliding pill background (keep mounted to avoid jump/flicker) */}
          <motion.div
            layoutId="nav-pill"
            className="absolute bg-primary/20 border border-primary/30 rounded-full top-1/2"
            initial={false}
            animate={{
              opacity: pillPosition ? 1 : 0,
              left: pillPosition?.left ?? 0,
              width: pillPosition?.width ?? 0,
              height: 44,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 42,
              mass: 0.6,
            }}
            style={{ marginTop: -22, pointerEvents: "none" }}
          />

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
                  active ? "px-4 py-2 gap-2" : "flex-col px-3 py-2 min-w-[52px]",
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
                    active ? "text-sm text-primary" : "text-[10px] text-silver-muted mt-1",
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
                      active ? "ml-1" : "absolute -top-0.5 -right-0.5",
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
