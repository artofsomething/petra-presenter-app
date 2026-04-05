import { useEffect, useRef } from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Particles({ config }: { config: AnimatedBackground }) {
    const bg = config.backgroundColor ??'#050510';
    const c1  = config.color1 ?? '#6366f1';
    const c2  = config.color2 ?? '#8b5cf6';
    const c3  = config.color3 ?? '#06b6d4';
    const spd = config.speed  ?? 1;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const colors  = [c1, c2, c3];
        const COUNT   = 60;
        const CONNECT = 120;

        const particles = Array.from({ length: COUNT }, (_, i) => ({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        vx:    (Math.random() - 0.5) * spd,
        vy:    (Math.random() - 0.5) * spd,
        r:     1.5 + Math.random() * 2,
        color: colors[i % 3],
        }));

        let raf: number;

        const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
            const dx   = particles[i].x - particles[j].x;
            const dy   = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONNECT) {
                ctx.strokeStyle = particles[i].color;
                ctx.globalAlpha = (1 - dist / CONNECT) * 0.5;
                ctx.lineWidth   = 0.5;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
            }
        }

        ctx.globalAlpha = 1;
        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle   = p.color;
            ctx.shadowBlur  = 6;
            ctx.shadowColor = p.color;
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        raf = requestAnimationFrame(draw);
        };

        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [c1, c2, c3, spd]);

    return (
        <canvas
        ref={canvasRef}
        style={{
            position:   'absolute', inset: 0,
            width:      '100%',     height: '100%',
            background: bg,
        }}
        />
    );
}

export default Particles;