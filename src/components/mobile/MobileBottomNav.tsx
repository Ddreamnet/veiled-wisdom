import { memo, useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { BOTTOM_NAV_HEIGHT } from "@/lib/constants";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
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
import { isChatOpenAtom } from "@/atoms/chatAtoms";

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
  const isChatOpen = useAtomValue(isChatOpenAtom);
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const [pillPosition, setPillPosition] = useState<PillPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const safeAreaBottomStyle = "max(0px, calc(env(safe-area-inset-bottom, 0px) - 10px))";

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

    // Admin navigation - Dashboard, Gelirler, Mesajlar, Profil
    if (role === "admin") {
      return [
        {
          icon: LayoutDashboard,
          label: "Dashboard",
          href: "/admin/dashboard",
          matchPrefixes: ["/admin/dashboard", "/admin/users", "/admin/teachers", "/admin/categories", "/admin/curiosities", "/admin/pages", "/admin/approvals"]
        },
        { icon: CheckCircle, label: "Ödemeler", href: "/admin/payments", matchPrefixes: ["/admin/payments"] },
        { icon: TurkishLiraIcon, label: "Gelirler", href: "/admin/earnings", matchPrefixes: ["/admin/earnings"] },
        { icon: MessageSquare, label: "Mesajlar", href: "/messages", badge: unreadCount, matchPrefixes: messagesMatchPrefixes },
        {
          icon: User,
          label: "Profil",
          href: "/profile",
          matchPrefixes: profileMatchPrefixes,
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

      if (prefix === "/") {
        if (pathname === "/") best = Math.max(best, 1);
        continue;
      }

      if (pathname === prefix || pathname.startsWith(prefix)) {
        best = Math.max(best, prefix.length);
      }
    }

    return best;
  };

  const activeHref = useMemo(() => {
    const pathname = location.pathname;
    let bestHref: string | undefined;
    let bestLen = 0;

    for (const item of navItems) {
      const len = getItemMatchLength(item, pathname);
      if (len > bestLen) {
        bestLen = len;
        bestHref = item.href;
      }
    }

    if (bestLen === 0) return undefined;
    return bestHref;
  }, [location.pathname, navItems]);

  const isActive = (href: string) => activeHref === href;
  const ACTIVE_PILL_WIDTH = 110;

  const measurePill = () => {
    if (!activeHref) {
      setPillPosition(null);
      return;
    }
    if (!containerRef.current) return;

    const activeElement = itemRefs.current.get(activeHref);
    if (!activeElement) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();
    const centerOffset = (activeRect.width - ACTIVE_PILL_WIDTH) / 2;

    setPillPosition({
      left: activeRect.left - containerRect.left + centerOffset,
      width: ACTIVE_PILL_WIDTH,
    });
  };

  useLayoutEffect(() => {
    if (!activeHref) {
      setPillPosition(null);
      return;
    }

    measurePill();

    const fontsReady = (document as any).fonts?.ready as Promise<void> | undefined;
    let cancelled = false;
    fontsReady?.then(() => {
      if (!cancelled) measurePill();
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref, navItems.length]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let debounceId: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => measurePill(), 250);
    });

    ro.observe(container);

    return () => {
      ro.disconnect();
      clearTimeout(debounceId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref]);

  useEffect(() => {
    if (!pressedItem) {
      const raf = window.requestAnimationFrame(() => measurePill());
      return () => window.cancelAnimationFrame(raf);
    }
  }, [pressedItem]);

  if (isChatOpen) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div
        className="bg-background-elevated/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]"
        style={{ paddingBottom: safeAreaBottomStyle }}
      >
        <div
          ref={containerRef}
          className="relative flex items-end justify-around px-2.5 pb-1"
          style={{ height: `${BOTTOM_NAV_HEIGHT}px` }}
        >
          <motion.div
            className="absolute bg-primary/20 border border-primary/30 rounded-full top-1/2"
            initial={false}
            animate={{
              opacity: pillPosition ? 1 : 0,
              left: pillPosition?.left ?? 0,
              width: pillPosition?.width ?? 0,
              height: 36,
            }}
            transition={{
              type: "tween",
              duration: 0.2,
              ease: "easeOut",
            }}
            style={{ marginTop: -18, pointerEvents: "none" }}
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
                  "relative z-10 flex items-center justify-center self-end rounded-full transition-[padding,gap,width,opacity,transform] duration-200 ease-out",
                  active
                    ? "flex-row gap-1.5 px-3 py-1 min-w-[96px] max-w-[116px] h-9"
                    : "flex-col gap-0.5 px-2 py-0.5 w-[50px] h-9",
                  isPressed && "scale-95 opacity-80",
                )}
              >
                <div className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-visible">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      active ? "text-primary" : "text-silver-muted",
                    )}
                  />
                  {!active && typeof item.badge === "number" && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-3 h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[10px]"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </div>
                <span
                  className={cn(
                    "font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200 leading-none",
                    active
                      ? "text-xs text-primary max-w-[60px]"
                      : "text-[10px] text-silver-muted",
                  )}
                >
                  {item.label}
                </span>

                {active && typeof item.badge === "number" && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[10px]"
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
