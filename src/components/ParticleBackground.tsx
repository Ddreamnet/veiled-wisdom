import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  hue: number;
}

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 300);
    };
    window.addEventListener('resize', onResize);

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 8 : Math.min(20, Math.floor(canvas.offsetWidth / 50));

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 1,
      baseOpacity: Math.random() * 0.4 + 0.15,
      hue: Math.random() * 60 + 260,
    }));

    // Visibility + IntersectionObserver — only animate when visible AND in viewport
    let isPageVisible = !document.hidden;
    let isInViewport = true;

    const handleVisibility = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible && isInViewport && !animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const io = new IntersectionObserver(
      ([entry]) => {
        isInViewport = entry.isIntersecting;
        if (isInViewport && isPageVisible && !animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    // Simple circle draw — no per-frame gradient creation
    const animate = () => {
      if (!isPageVisible || !isInViewport) {
        animationFrameRef.current = undefined;
        return;
      }

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const time = Date.now() * 0.001;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const opacity = p.baseOpacity + Math.sin(time + i) * 0.15;

        // Smooth radial gradient — no sharp edge between core and glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 65%, ${opacity})`);
        grad.addColorStop(0.3, `hsla(${p.hue}, 80%, 65%, ${opacity * 0.6})`);
        grad.addColorStop(1, `hsla(${p.hue}, 80%, 65%, 0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      io.disconnect();
      clearTimeout(resizeTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)',
      }}
    />
  );
};
