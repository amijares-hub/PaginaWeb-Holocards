import React from 'react';

interface ChevronDividerProps {
  direction?: 'down' | 'up';
}

export default function ChevronDivider({ direction = 'down' }: ChevronDividerProps) {
  const isDown = direction === 'down';

  // Points para V hacia abajo o ^ hacia arriba
  const outer  = isDown ? "0,0 1000,0 500,220"    : "500,0 0,220 1000,220";
  const middle = isDown ? "60,0 940,0 500,190"     : "500,10 60,220 940,220";
  const inner  = isDown ? "160,0 840,0 500,155"    : "500,30 160,220 840,220";

  const gradientId = `chevronGrad_${direction}`;
  const x1 = isDown ? "50%" : "50%";
  const y1 = isDown ? "0%"  : "100%";
  const y2 = isDown ? "100%": "0%";

  return (
    <div className="w-full overflow-hidden leading-[0] my-2">
      <svg
        viewBox="0 0 1000 225"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-full h-24 md:h-36 lg:h-44"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1={x1} y1={y1} x2={x1} y2={y2}>
            <stop offset="0%"   stopColor="#0d1117" />
            <stop offset="60%"  stopColor="#1a2a3a" />
            <stop offset="100%" stopColor="#00bfff" />
          </linearGradient>
        </defs>

        {/* Capa exterior — gris oscuro */}
        <polygon points={outer}  fill="#1c2333" />

        {/* Capa media — gris medio */}
        <polygon points={middle} fill="#252e42" />

        {/* Capa interior — gradiente cian */}
        <polygon points={inner}  fill={`url(#${gradientId})`} />
      </svg>
    </div>
  );
}
