"use client";

import React from "react";
import { motion } from "framer-motion";

export interface Testimonial {
  text: string;
  highlight?: string;
  image: string;
  name: string;
  role: string;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  speed?: number;
  direction?: "left" | "right";
  cardHeight?: number;
  className?: string;
}

export const TestimonialsCarousel: React.FC<TestimonialsCarouselProps> = ({
  testimonials = [],
  speed = 20,
  direction = "left",
  cardHeight = 200,
  className,
}) => {
  if (!testimonials || testimonials.length === 0) return null;

  const loopTestimonials = [...testimonials, ...testimonials];

  return (
    <div className={`overflow-hidden w-full ${className || ''}`}>
      <motion.div
        animate={{
          x: direction === "left" ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          duration: Math.max(speed, 5),
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex gap-6"
      >
        {loopTestimonials.map(({ text, highlight, image, name, role }, index) => {
          const uniqueKey = `${name}-${index}`;
          const hasHighlight = Boolean(highlight && highlight.trim().length > 0);

          return (
            <motion.div
              key={uniqueKey}
              whileHover={{ scale: 1.05, rotate: 1 }}
              className="bg-card text-card-foreground my-3 border border-border rounded-3xl p-4 shadow-xl flex-shrink-0 w-[320px] transition-colors"
              style={{ height: cardHeight }}
            >
              <p className="text-sm leading-relaxed text-justify break-words whitespace-normal overflow-hidden">
                {hasHighlight && highlight
                  ? text.split(highlight).map((part, idx, arr) => (
                      <React.Fragment key={idx}>
                        {part}
                        {idx !== arr.length - 1 && (
                          <span className="text-red-500 dark:text-red-400 font-semibold">
                            {highlight}
                          </span>
                        )}
                      </React.Fragment>
                    ))
                  : text}
              </p>

              <div className="flex items-center gap-3 mt-4">
                <img
                  src={image}
                  alt={name}
                  width={50}
                  height={50}
                  className="h-12 w-12 rounded-full object-cover border border-border"
                />
                <div className="flex flex-col">
                  <div className="font-bold text-sm leading-tight text-foreground">{name}</div>
                  <div className="text-xs text-muted-foreground">{role}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};