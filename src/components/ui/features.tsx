import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";

interface Feature {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
}

interface FeaturesProps {
  features: Feature[];
  sectionTitle?: string;
  sectionSubtitle?: string;
  primaryColor?: string;
  progressGradientLight?: string;
  progressGradientDark?: string;
}

export function Features({
  features,
  sectionTitle = "Categorías de Élite",
  sectionSubtitle = "Explora nuestro catálogo especializado",
  progressGradientLight = "bg-gradient-to-r from-red-400 to-red-600",
  progressGradientDark = "bg-gradient-to-r from-red-600 to-red-700",
}: FeaturesProps) {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [progress, setProgress] = useState(0);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        setCurrentFeature((prev) => (prev + 1) % features.length);
        setProgress(0);
      }, 200);
    }
  }, [progress, features.length]);

  useEffect(() => {
    const activeFeatureElement = featureRefs.current[currentFeature];
    const container = containerRef.current;

    if (activeFeatureElement && container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeFeatureElement.getBoundingClientRect();

      container.scrollTo({
        left:
          activeFeatureElement.offsetLeft -
          (containerRect.width - elementRect.width) / 2,
        behavior: "smooth",
      });
    }
  }, [currentFeature]);

  const handleFeatureClick = (index: number) => {
    setCurrentFeature(index);
    setProgress(0);
  };

  return (
    <section className="py-24 px-6 overflow-hidden bg-black/40 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12 sm:mb-20 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
            <div>
              <p className="text-red-500 font-mono font-black text-[10px] uppercase tracking-[0.4em] mb-2">{sectionSubtitle}</p>
              <h2 className="text-3xl sm:text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9]">{sectionTitle}</h2>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 lg:gap-20 gap-12 items-center">
          {/* Left Side - Features with Progress Lines */}
          <div
            ref={containerRef}
            className="lg:space-y-6 md:space-x-6 lg:space-x-0 overflow-x-auto no-scrollbar lg:overflow-visible flex lg:flex lg:flex-col flex-row order-2 lg:order-1 pb-4 scroll-smooth"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isActive = currentFeature === index;

              return (
                <div
                  key={feature.id}
                  ref={(el) => {
                    featureRefs.current[index] = el;
                  }}
                  className="relative cursor-pointer flex-shrink-0 w-full md:w-auto"
                  onClick={() => handleFeatureClick(index)}
                >
                  {/* Feature Content */}
                  <div
                    className={cn(
                      "flex lg:flex-row flex-col items-center lg:items-start gap-4 sm:gap-6 p-4 sm:p-6 transition-all duration-500 rounded-3xl border text-center lg:text-left",
                      isActive
                        ? "bg-zinc-900/80 border-white/10 shadow-2xl shadow-red-900/10"
                        : "bg-transparent border-transparent grayscale opacity-40 hover:opacity-70"
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "p-4 rounded-2xl transition-all duration-500",
                        isActive
                          ? "bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40"
                          : "bg-zinc-900 text-zinc-500 flex items-center justify-center"
                      )}
                    >
                      <Icon size={24} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1 sm:space-y-2">
                      <h3
                        className={cn(
                          "text-lg sm:text-xl font-black uppercase italic tracking-tight transition-colors duration-500",
                          isActive ? "text-white" : "text-zinc-500"
                        )}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className={cn(
                          "text-xs sm:text-sm font-medium transition-colors duration-500 line-clamp-2",
                          isActive ? "text-zinc-400" : "text-zinc-600"
                        )}
                      >
                        {feature.description}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mt-4 bg-white/5 rounded-full h-1 overflow-hidden">
                        {isActive && (
                          <motion.div
                            className={cn("h-full", progressGradientLight)}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.1, ease: "linear" }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side - Image Display */}
          <div className="relative order-1 lg:order-2">
            <div className="aspect-[4/3] relative rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <img
                    className="w-full h-full object-cover"
                    src={features[currentFeature].image}
                    alt={features[currentFeature].title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                  
                  {/* Floating Info Overlay */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-10 left-10 right-10"
                  >
                    <span className="text-red-500 font-mono font-black text-[10px] tracking-[0.4em] uppercase mb-2 block">
                      Featured_Asset
                    </span>
                    <h4 className="text-xl sm:text-3xl font-black italic uppercase text-white tracking-tighter">
                      {features[currentFeature].title}
                    </h4>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Decorative element */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/20 blur-[80px] rounded-full -z-10" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-600/10 blur-[80px] rounded-full -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
