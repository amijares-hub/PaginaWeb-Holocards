// components/ui/cta-card.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";

// Define the props for the CtaCard component
interface CtaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc: string;
  title: string;
  description: string;
  inputPlaceholder?: string;
  buttonText: string;
  onButtonClick?: (email: string) => void;
}

const CtaCard = React.forwardRef<HTMLDivElement, CtaCardProps>(
  (
    {
      className,
      imageSrc,
      title,
      description,
      inputPlaceholder = "Email address",
      buttonText,
      onButtonClick,
      ...props
    },
    ref
  ) => {
    const [email, setEmail] = React.useState("");
    const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success'>('idle');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!email || status === 'submitting') return;
      
      setStatus('submitting');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (onButtonClick) {
        onButtonClick(email);
      }
      setStatus('success');
      console.log("Email submitted:", email);
    };

    // Animation variants for Framer Motion
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.2,
          delayChildren: 0.1,
        },
      },
    };

    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          type: "spring",
          stiffness: 100,
          damping: 12,
        },
      },
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-black text-card-foreground shadow-2xl",
          className
        )}
        {...props}
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src={imageSrc}
            alt="Background"
            className="h-full w-full object-cover opacity-40 mix-blend-luminosity grayscale"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-red-600/5 mix-blend-overlay" />
        </div>

        {/* Content */}
        <motion.div
          className="relative z-10 grid h-full grid-cols-1 items-center gap-12 p-10 md:grid-cols-2 md:p-16 lg:p-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="flex flex-col items-start text-left">
            <motion.div 
               variants={itemVariants}
               className="flex items-center gap-2 mb-6"
            >
                <div className="p-2 bg-red-600/20 text-red-500 rounded-lg">
                    <Sparkles className="size-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Premium_Access</span>
            </motion.div>
            
            <motion.h2
              className="text-4xl font-black italic tracking-tighter md:text-5xl lg:text-7xl uppercase text-white leading-[0.9]"
              variants={itemVariants}
            >
              {title}
            </motion.h2>
            <motion.p
              className="mt-8 max-w-xl text-lg md:text-xl font-medium text-zinc-400 uppercase tracking-wide leading-relaxed"
              variants={itemVariants}
            >
              {description}
            </motion.p>
          </div>

          <motion.div className="flex w-full max-w-md flex-col items-center justify-center relative" variants={itemVariants}>
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center p-8 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 w-full"
                >
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-red-600/40">
                    <CheckCircle2 className="text-white w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">¡Suscrito con éxito!</h3>
                  <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Revisa tu bandeja de entrada para una sorpresa especial de Sasori Labs.</p>
                  <Button 
                    variant="ghost" 
                    className="mt-6 text-zinc-500 hover:text-white"
                    onClick={() => setStatus('idle')}
                  >
                    Volver a registrarse
                  </Button>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex w-full flex-col gap-4 p-8 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Newsletter_Registration</label>
                    <Input
                      type="email"
                      placeholder={inputPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 w-full border-white/10 bg-black/40 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-red-600 rounded-2xl transition-all"
                      aria-label={inputPlaceholder}
                      disabled={status === 'submitting'}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="h-14 w-full bg-red-600 text-white hover:bg-red-700 font-black italic uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-red-600/20 transition-all active:scale-95"
                  >
                    {status === 'submitting' ? "Procesando..." : buttonText}
                    {status !== 'submitting' && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                  <p className="text-center text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Sin compromiso • Solo contenido exclusivo</p>
                </form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    );
  }
);

CtaCard.displayName = "CtaCard";

export { CtaCard };
