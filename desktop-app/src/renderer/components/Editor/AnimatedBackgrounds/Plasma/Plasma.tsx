import { useEffect, useRef } from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Plasma({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#ff0080';
  const c2  = config.color2 ?? '#7928ca';
  const c3  = config.color3 ?? '#0070f3';
  const spd = config.speed  ?? 1;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use small internal resolution for performance, CSS scales it up
    const W = 120, H = 80;
    canvas.width  = W;
    canvas.height = H;

    // Parse hex to rgb
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const rgb1 = hexToRgb(c1.length === 7 ? c1 : '#ff0080');
    const rgb2 = hexToRgb(c2.length === 7 ? c2 : '#7928ca');
    const rgb3 = hexToRgb(c3.length === 7 ? c3 : '#0070f3');

    const imageData = ctx.createImageData(W, H);
    let t = 0;
    let raf: number;

    const draw = () => {
      t += 0.03 * spd;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          // Classic plasma formula
          const v1 = Math.sin(x * 0.15 + t);
          const v2 = Math.sin(y * 0.1  + t * 0.8);
          const v3 = Math.sin((x * 0.1 + y * 0.15) + t * 1.2);
          const v4 = Math.sin(Math.sqrt(
            (x - W / 2) * (x - W / 2) * 0.04 +
            (y - H / 2) * (y - H / 2) * 0.04,
          ) + t);

          const value = (v1 + v2 + v3 + v4) / 4; // -1 … 1
          const n     = (value + 1) / 2;           //  0 … 1

          // Blend between 3 colours using the plasma value
          let r, g, b;
          if (n < 0.5) {
            const f = n * 2;
            r = Math.round(rgb1.r * (1 - f) + rgb2.r * f);
            g = Math.round(rgb1.g * (1 - f) + rgb2.g * f);
            b = Math.round(rgb1.b * (1 - f) + rgb2.b * f);
          } else {
            const f = (n - 0.5) * 2;
            r = Math.round(rgb2.r * (1 - f) + rgb3.r * f);
            g = Math.round(rgb2.g * (1 - f) + rgb3.g * f);
            b = Math.round(rgb2.b * (1 - f) + rgb3.b * f);
          }

          const idx          = (y * W + x) * 4;
          imageData.data[idx]     = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = b;
          imageData.data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [c1, c2, c3, spd]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:        'absolute', inset: 0,
        width:           '100%',     height: '100%',
        imageRendering:  'pixelated', // keep the blurry-smooth look
      }}
    />
  );
}

export default Plasma;