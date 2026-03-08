import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { isChatOpenAtom } from '@/atoms/chatAtoms';

const ROOT_TAB_PATHS = [
  '/',
  '/explore',
  '/messages',
  '/appointments',
  '/profile',
  '/admin/dashboard',
  '/admin/earnings',
  '/admin/payments',
];

const EDGE_THRESHOLD = 30; // px from left edge
const MIN_SWIPE_X = 80;   // minimum horizontal distance
const MAX_SWIPE_Y = 50;   // maximum vertical distance

function hasScrollableAncestor(el: HTMLElement | null): boolean {
  let current = el;
  while (current) {
    if (current.scrollWidth > current.clientWidth) {
      const style = window.getComputedStyle(current);
      const overflowX = style.overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') {
        return true;
      }
    }
    current = current.parentElement;
  }
  return false;
}

export function useSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatOpen = useAtomValue(isChatOpenAtom);

  const touchRef = useRef<{
    startX: number;
    startY: number;
    swiping: boolean;
  } | null>(null);

  useEffect(() => {
    const isRootTab = ROOT_TAB_PATHS.some(path => {
      if (path === '/') return location.pathname === '/';
      return location.pathname === path || location.pathname.startsWith(path + '/');
    });

    // Disable on root tabs or when chat overlay is open
    if (isRootTab || isChatOpen) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX > EDGE_THRESHOLD) return;
      if (hasScrollableAncestor(e.target as HTMLElement)) return;

      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        swiping: false,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchRef.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchRef.current.startX;
      const deltaY = Math.abs(touch.clientY - touchRef.current.startY);

      if (deltaX > MIN_SWIPE_X && deltaY < MAX_SWIPE_Y) {
        touchRef.current.swiping = true;
      }
    };

    const onTouchEnd = () => {
      if (touchRef.current?.swiping) {
        navigate(-1);
      }
      touchRef.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [location.pathname, isChatOpen, navigate]);
}
