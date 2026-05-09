import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import NavMenu from "./menu-hover-effects";

interface NavigationItem {
  label: string;
  hasDropdown?: boolean;
  onClick?: () => void;
}

interface ProgramCard {
  image: string;
  category: string;
  title: string;
  onClick?: () => void;
}

interface PulseFitHeroProps {
  logo?: string;
  navigation?: NavigationItem[];
  ctaButton?: {
    label: string;
    onClick: () => void;
  };
  title: string;
  subtitle: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  disclaimer?: string;
  socialProof?: {
    avatars: string[];
    text: string;
  };
  programs?: ProgramCard[];
  className?: string;
  children?: React.ReactNode;
}

export function PulseFitHero({
  logo = "Sasori Labs",
  navigation = [],
  ctaButton,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  disclaimer,
  socialProof,
  programs = [],
  className,
  children,
}: PulseFitHeroProps) {
  return (
    <section
      className={cn(
        "relative w-full min-h-screen flex flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(9,9,11,0.5)_0%,rgba(24,24,27,0.7)_50%,rgba(9,9,11,1)_100%),url('/Imagenes/banner%201.png')] bg-cover bg-center bg-fixed",
        className
      )}
      role="banner"
      aria-label="Hero section"
    >
      {/* Header removed as it was redundant with main navbar */}

      {/* Main Content */}
      {children ? (
        <div className="relative z-10 flex-1 flex items-center justify-center w-full">
          {children}
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col items-center text-center max-w-4xl gap-8"
          >
            {/* Title */}
            <h1
              className="font-sans font-black italic uppercase tracking-tighter text-[#E1E0CC] text-[clamp(36px,6vw,72px)] leading-[1.1] tracking-[-0.04em]"
            >
              {title}
            </h1>

            {/* Subtitle */}
            <p
              className="font-sans font-medium uppercase tracking-widest text-[#E1E0CC] text-[clamp(14px,1.5vw,16px)] leading-[1.6] max-w-[700px]"
            >
              {subtitle}
            </p>

            {/* Action Buttons */}
            {(primaryAction || secondaryAction) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center gap-4"
              >
                {primaryAction && (
                  <button
                    onClick={primaryAction.onClick}
                    className="flex flex-row items-center gap-2 px-8 py-4 rounded-full transition-all hover:scale-105 bg-red-600 shadow-2xl shadow-red-600/30 font-black italic uppercase tracking-widest text-xs"
                  >
                    {primaryAction.label}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7 10H13M13 10L10 7M13 10L10 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}

                {secondaryAction && (
                  <button
                    onClick={secondaryAction.onClick}
                    className="px-8 py-4 rounded-full transition-all hover:scale-105 bg-white/5 border border-white/10 text-white font-black italic uppercase tracking-widest text-xs hover:bg-white/10"
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </motion.div>
            )}

            {/* Disclaimer */}
            {disclaimer && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-500 font-bold"
              >
                {disclaimer}
              </motion.p>
            )}

            {/* Social Proof */}
            {socialProof && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-row items-center gap-3"
              >
                <div className="flex flex-row -space-x-2">
                  {socialProof.avatars.map((avatar, index) => (
                    <img
                      key={index}
                      src={avatar}
                      alt={`User ${index + 1}`}
                      className="rounded-full border-2 border-[#1a1a1a] w-10 h-10 object-cover"
                    />
                  ))}
                </div>
                <span
                  className="font-sans font-bold uppercase tracking-wider text-white/40 text-[10px]"
                >
                  {socialProof.text}
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {/* Program Cards Carousel */}
      {programs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="relative z-10 w-full overflow-hidden py-10"
        >
          {/* Gradient Overlays - reduced width on mobile */}
          <div
            className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none w-[clamp(50px,10vw,150px)] bg-gradient-to-r from-[#09090b] to-transparent"
          />
          <div
            className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none w-[clamp(50px,10vw,150px)] bg-gradient-to-l from-[#09090b] to-transparent"
          />

          {/* Scrolling Container */}
          <motion.div
            className="flex items-center gap-4 pl-4"
            animate={{
              x: [0, -((programs.length * 380) / 2)],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: programs.length * 5,
                ease: "linear",
              },
            }}
          >
            {/* Duplicate programs for seamless loop */}
            {[...programs, ...programs].map((program, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
                onClick={program.onClick}
                className="flex-shrink-0 cursor-pointer relative overflow-hidden group w-[clamp(280px,80vw,356px)] h-[clamp(380px,60vh,480px)] rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5"
              >
                {/* Image */}
                <img
                  src={program.image}
                  alt={program.title}
                  className="transition-transform duration-700 group-hover:scale-110 w-full h-full object-cover"
                />

                {/* Gradient Overlay */}
                <div
                  className="absolute inset-0 z-10 bg-gradient-to-b from-transparent to-black/80"
                />

                {/* Text Content */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-8 z-20 flex flex-col gap-3"
                >
                  <span
                    className="font-mono font-black italic text-red-500 uppercase tracking-[0.3em] text-[10px]"
                  >
                    {program.category}
                  </span>
                  <h3
                    className="font-sans font-black italic uppercase tracking-tighter text-white text-[26px] leading-[1.1]"
                  >
                    {program.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
