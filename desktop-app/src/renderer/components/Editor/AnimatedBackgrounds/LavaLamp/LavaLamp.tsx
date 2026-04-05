import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function LavaLamp({ config }: { config: AnimatedBackground }) {
    const bg = config.backgroundColor??'#1a0a00';
    const c1  = config.color1 ?? '#ff6b6b';
    const c2  = config.color2 ?? '#ffd93d';
    const c3  = config.color3 ?? '#ff8e53';
    const spd = config.speed  ?? 1;

    const blobs = React.useMemo(() => [
        { w: '55%', h: '55%', top: '-15%', left: '-10%', color: c1, anim: 'lava-blob-1', dur: 12 / spd },
        { w: '50%', h: '50%', top: '40%',  left: '50%',  color: c2, anim: 'lava-blob-2', dur: 15 / spd },
        { w: '45%', h: '45%', top: '20%',  left: '20%',  color: c3, anim: 'lava-blob-3', dur: 10 / spd },
        { w: '40%', h: '40%', top: '55%',  left: '-5%',  color: c2, anim: 'lava-blob-1', dur: 18 / spd },
        { w: '35%', h: '35%', top: '-5%',  left: '60%',  color: c1, anim: 'lava-blob-2', dur: 14 / spd },
    ], [c1, c2, c3, spd]);

    return (
        <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        background: bg,
        }}>
        {/* Dark tinted glass overlay */}
        <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.25)',
            zIndex: 1,
        }} />
        {blobs.map((b, i) => (
            <div key={i} style={{
            position:        'absolute',
            width:           b.w,
            height:          b.h,
            top:             b.top,
            left:            b.left,
            background:      `radial-gradient(circle at 40% 40%, ${b.color}ee 0%, ${b.color}77 50%, transparent 80%)`,
            filter:          'blur(30px)',
            animation:       `${b.anim} ${b.dur.toFixed(1)}s ease-in-out infinite`,
            animationDelay:  `${-i * 2.5}s`,
            mixBlendMode:    'screen',
            }} />
        ))}
        {/* Highlight sheen */}
        <div style={{
            position:   'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.06) 0%, transparent 60%)',
            zIndex:     2,
        }} />
        </div>
    );
};

export default LavaLamp;