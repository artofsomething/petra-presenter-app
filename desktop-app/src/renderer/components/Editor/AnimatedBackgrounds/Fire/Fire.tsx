import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Fire({ config }: { config: AnimatedBackground }) {
    const bg1 = config.backgroundColor ?? '#1a0000';
    const bg2 = config.backgroundColor2 ?? '#000';
    const c1  = config.color1 ?? '#ef4444';
    const c2  = config.color2 ?? '#f97316';
    const c3  = config.color3 ?? '#fbbf24';
    const spd = config.speed  ?? 1;

    const flames = React.useMemo(() => {
        return Array.from({ length: 20 }, (_, i) => ({
        width:  40 + (i * 13) % 80,
        height: 80 + (i * 17) % 120,
        x:      `${(i * 5.1) % 100}%`,
        dur:    (1.5 + (i % 4) * 0.5) / spd,
        delay:  -(i * 0.3),
        color:  i % 3 === 0 ? c3 : i % 2 === 0 ? c2 : c1,
        layer:  i % 3,
        }));
    }, [c1, c2, c3, spd]);

    return (
        <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        background: `radial-gradient(ellipse at bottom, ${bg1} 0%, ${bg2} 100%)`,
        }}>
        {flames.map((f, i) => (
            <div key={i} style={{
            position:        'absolute',
            bottom:          0,
            left:            f.x,
            width:           f.width,
            height:          f.height,
            background:      `radial-gradient(ellipse at bottom, ${f.color}cc 0%, ${f.color}44 50%, transparent 100%)`,
            borderRadius:    '50% 50% 30% 30% / 60% 60% 40% 40%',
            opacity:         0.7,
            filter:          'blur(4px)',
            transformOrigin: 'bottom center',
            animation:       [
                `fire-rise    ${f.dur.toFixed(1)}s    ease-in    infinite ${f.delay}s`,
                `fire-flicker ${(f.dur * 0.3).toFixed(1)}s ease-in-out infinite`,
            ].join(', '),
            }} />
        ))}
        <div style={{
            position:   'absolute',
            bottom:     0, left: 0, right: 0,
            height:     '30%',
            background: `linear-gradient(0deg, ${c1}88 0%, transparent 100%)`,
            filter:     'blur(20px)',
        }} />
        </div>
    );
}

export default Fire;