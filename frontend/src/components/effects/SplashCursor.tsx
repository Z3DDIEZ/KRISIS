import React, { useEffect, useRef } from 'react';

const SplashCursor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w: number, h: number;
    let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    const colors = ['#E67E22', '#D35400', '#0A0A0A'];

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const createParticle = (x: number, y: number) => {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    };

    const update = () => {
      ctx.clearRect(0, 0, w, h);
      particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life > 0) {
          ctx.globalAlpha = p.life * 0.3;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
          ctx.fill();
          return true;
        }
        return false;
      });
      requestAnimationFrame(update);
    };

    const onMove = (e: MouseEvent) => {
      for (let i = 0; i < 2; i++) createParticle(e.clientX, e.clientY);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    resize();
    update();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
};

export default SplashCursor;
