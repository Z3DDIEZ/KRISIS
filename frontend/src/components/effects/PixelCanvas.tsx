import React, { useEffect, useRef } from 'react';

interface PixelCanvasProps {
  gap?: number;
  speed?: number;
  colors?: string[];
  className?: string;
}

const PixelCanvas: React.FC<PixelCanvasProps> = ({ gap = 8, speed = 0.02, colors = ['#f97316', '#0a0a0a', '#71717a'], className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let w: number, h: number;
    let points: { x: number; y: number; s: number; c: string }[] = [];

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      points = [];
      for (let x = 0; x < w; x += gap) {
        for (let y = 0; y < h; y += gap) {
          points.push({
            x,
            y,
            s: Math.random(),
            c: colors[Math.floor(Math.random() * colors.length)]
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      points.forEach(p => {
        p.s += speed;
        if (p.s > 1) p.s = 0;
        ctx.globalAlpha = Math.sin(p.s * Math.PI) * 0.05;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, 1, 1);
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gap, speed, colors]);

  return <canvas ref={canvasRef} className={`fixed inset-0 pointer-events-none z-[-1] opacity-50 ${className}`} />;
};

export default PixelCanvas;
