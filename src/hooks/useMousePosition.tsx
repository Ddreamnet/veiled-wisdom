import { useState, useEffect } from 'react';
import { throttle } from '@/lib/performance';

export const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Throttle to 60fps (16ms)
    const updateMousePosition = throttle((e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }, 16);

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  return mousePosition;
};
