import { motion, useInView } from "motion/react";
import { ArrowRight } from "lucide-react";
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import NavMenu from "./menu-hover-effects";

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block relative"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- Hero ---------------- */

const PrismaHero = () => {
  return (
    <section className="h-screen w-full">
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        
        {/* Background video - Fallback to image if video fails or for design style */}
        <div className="absolute inset-0 bg-black">
           <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-60"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          />
        </div>

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-overlay" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Navbar */}
        <NavMenu />

        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pt-20">
          <div className="max-w-7xl w-full flex flex-col items-center text-center relative">
            
            {/* Floating Assets Preview */}
            <div className="absolute inset-0 pointer-events-none -z-10 hidden xl:block">
              <motion.div 
                animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 -left-20 w-40 h-56 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              >
                 <img src="/Imagenes/ME03_ES_85.png" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-red-600/10 mix-blend-overlay"></div>
              </motion.div>
              <motion.div 
                animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-0 -right-20 w-48 h-64 bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              >
                 <img src="/Imagenes/ME03_ES_88.png" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-red-600/10 mix-blend-overlay"></div>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4"
            >
              <h1
                className="font-black leading-[0.75] tracking-[-0.08em] text-[20vw] sm:text-[18vw] md:text-[16vw] lg:text-[14vw] italic uppercase drop-shadow-2xl"
                style={{ color: "#E1E0CC" }}
              >
                <WordsPullUp text="HoloCard" showAsterisk />
              </h1>
            </motion.div>

            <div className="flex flex-col items-center gap-12 max-w-4xl">
              {/* Premium Asset Grid Preview */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-4 mt-8 opacity-40 hover:opacity-80 transition-opacity duration-700">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="w-12 h-16 sm:w-16 sm:h-22 md:w-20 md:h-28 bg-zinc-900 border border-white/10 rounded-lg overflow-hidden group/card relative"
                  >
                     <img 
                       src={`https://images.unsplash.com/photo-${1613771404721 + i}?q=80&w=100&auto=format&fit=crop`} 
                       alt="card" 
                       className="w-full h-full object-cover grayscale group-hover/card:grayscale-0 transition-all" 
                       onError={(e) => {
                         (e.target as HTMLImageElement).src = '/Imagenes/img_47014_6bbd0ab7d5f676fd4f2a8aa92378e54a_20.jpg';
                       }}
                     />
                     <div className="absolute inset-0 bg-red-600/5 group-hover/card:bg-transparent transition-colors"></div>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export {PrismaHero}
