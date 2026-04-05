import { useEffect, useRef } from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Lightning({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#a78bfa';
  const c2  = config.color2 ?? '#e879f9';
  const c3  = config.color3 ?? '#38bdf8';
  const spd = config.speed  ?? 1;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = [c1, c2, c3];

    const _canvas = canvas;
    const _ctx    = ctx;

    // Recursive lightning bolt drawing
    function drawBolt(
      x1: number, y1: number, x2: number, y2: number,
      depth: number, color: string,
    ) {
      if (depth === 0) {
        _ctx.beginPath();
        _ctx.moveTo(x1, y1);
        _ctx.lineTo(x2, y2);
        _ctx.strokeStyle = color;
        _ctx.lineWidth   = 1;
        _ctx.globalAlpha = 0.9;
        _ctx.shadowBlur  = 12;
        _ctx.shadowColor = color;
        _ctx.stroke();
        return;
      }
      const mx   = (x1 + x2) / 2 + (Math.random() - 0.5) * (_canvas.height / (depth * 2));
      const my   = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
      drawBolt(x1, y1, mx, my, depth - 1, color);
      drawBolt(mx, my, x2, y2, depth - 1, color);
      // Branch
      if (depth === 2 && Math.random() > 0.5) {
        const bx = mx + (Math.random() - 0.5) * _canvas.width * 0.3;
        const by = my + _canvas.height * 0.2 * Math.random();
        _ctx.globalAlpha = 0.4;
        drawBolt(mx, my, bx, by, depth - 1, color);
      }
    }

    let raf: number;
    let frameCount = 0;
    const INTERVAL = Math.round(60 / spd);

    const animate = () => {
      frameCount++;

      // Clear with dark overlay
      _ctx.fillStyle = 'rgba(0,0,5,0.4)';
      _ctx.fillRect(0, 0, _canvas.width, _canvas.height);

      // Strike on interval
      if (frameCount % INTERVAL === 0) {
        _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
        _ctx.fillStyle = '#000005';
        _ctx.fillRect(0, 0, _canvas.width, _canvas.height);

        const numBolts = 1 + Math.floor(Math.random() * 3);
        for (let b = 0; b < numBolts; b++) {
          const x     = Math.random() * _canvas.width;
          const color = colors[Math.floor(Math.random() * colors.length)];
          _ctx.shadowBlur  = 20;
          _ctx.shadowColor = color;
          _ctx.globalAlpha = 1;
          drawBolt(x, 0, x + (Math.random() - 0.5) * 200, _canvas.height, 4, color);
        }
        _ctx.shadowBlur  = 0;
        _ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(animate);
    };

    // Initial dark background
    _ctx.fillStyle = '#000005';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [c1, c2, c3, spd]);

  return (
    <>
      <div style={{
        position:   'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #000005 60%)',
      }} />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {/* Ambient glow flashes */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 20%, ${c1}22 0%, transparent 60%)`,
        animation:  `lightning-glow ${(3 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
    </>
  );
}
export default Lightning;