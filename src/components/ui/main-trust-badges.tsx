import { ShieldCheck, Truck, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const badges = [
  {
    icon: ShieldCheck,
    title: "Authenticity Guaranteed",
    description: "Every card in our inventory undergoes a rigorous 15-point verification process by certified experts to ensure 100% authenticity."
  },
  {
    icon: Truck,
    title: "Global Insured Shipping",
    description: "Priority handling with full insurance for all orders. Real-time tracking included for high-value assets to any destination."
  },
  {
    icon: Star,
    title: "Exclusive Member Vault",
    description: "Join Sasori Elite for first access to secret drops, vintage warehouse finds, and private auction listings before they go public."
  }
];

export function MainTrustBadges() {
  return (
    <section className="py-24 bg-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {badges.map((badge, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="group space-y-6"
            >
              <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-3xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all duration-500 shadow-2xl shadow-red-900/10">
                <badge.icon className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                  {badge.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                  {badge.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
