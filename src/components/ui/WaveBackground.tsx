import React from 'react';

export default function WaveBackground() {
  const totalLines = 24;
  const lineSpacing = 15;

  return (
    <div className="absolute inset-0 w-full h-full bg-black pointer-events-none z-0 overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 550"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="holocards-exact-neon-flow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />   
            <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.40" />  
            <stop offset="65%" stopColor="#2563eb" stopOpacity="0.30" />  
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.10" /> 
          </linearGradient>
        </defs>
        
        <g fill="none" stroke="url(#holocards-exact-neon-flow)" strokeWidth="1.3">
          {Array.from({ length: totalLines }).map((_, i) => {
            const baseY = i * lineSpacing - 100;
            
            return (
              <path
                key={i}
                d={`M -50 ${baseY + 180} 
                    C 300 ${baseY - 30}, 600 ${baseY + 60}, 950 ${baseY + 250} 
                    S 1300 ${baseY + 60}, 1550 ${baseY + 110}`}
              />
            );
          })}
        </g>
      </svg>
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-gray-950" />
    </div>
  );
}