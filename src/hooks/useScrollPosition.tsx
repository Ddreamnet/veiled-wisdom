import { useState, useEffect } from 'react';
import { throttle } from '@/lib/performance';

export const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    // Throttle to 60fps (16ms)
    const updateScrollPosition = throttle(() => {
      setScrollPosition(window.scrollY);
    }, 16);

    window.addEventListener('scroll', updateScrollPosition, { passive: true });
    updateScrollPosition();

    return () => {
      window.removeEventListener('scroll', updateScrollPosition);
    };
  }, []);

  return scrollPosition;
};
