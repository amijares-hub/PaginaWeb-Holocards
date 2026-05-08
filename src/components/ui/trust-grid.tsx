import { 
  Zap, 
  ShieldCheck, 
  Star, 
  Truck, 
  Gift, 
  CreditCard, 
  Coins, 
  Clock, 
  Target 
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const allTrustItems = [
  {
    icon: Target,
    title: "Expertos en Pokémon y TCG",
    description: "Personal altamente cualificado con años de experiencia en el mercado de cartas coleccionables."
  },
  {
    icon: Star,
    title: "4,8/5 en +2.500 valoraciones",
    description: "La confianza de nuestra comunidad es nuestro mayor activo. Valoraciones reales de clientes satisfechos."
  },
  {
    icon: Truck,
    title: "Envío rápido desde España",
    description: "Logística optimizada para entregas en 24-72h a todas las Islas Canarias y Península."
  },
  {
    icon: Gift,
    title: "Promociones y regalos",
    description: "Acceso exclusivo a sorteos de cartas raras y detalles especiales en cada pedido premium."
  },
  {
    icon: ShieldCheck,
    title: "Pago 100% seguro",
    description: "Pasarelas cifradas de última generación para garantizar la total seguridad de tus transacciones."
  },
  {
    icon: Zap,
    title: "Envío Gratis > 180€",
    description: "Pedidos superiores a 180€ disfrutan de envío gratuito y asegurado a toda la península."
  },
  {
    icon: Coins,
    title: "Gana Puntos",
    description: "Recibe puntos de lealtad con cada pedido que podrás canjear por descuentos y activos exclusivos."
  },
  {
    icon: Clock,
    title: "Entrega Rápida",
    description: "Envíos ágiles todos los días laborables para que tus cartas lleguen lo antes posible."
  },
  {
    icon: ShieldCheck,
    title: "Envío el mismo día",
    description: "Realiza tu pedido antes de las 14:00h en día hábil y saldrá de nuestro almacén hoy mismo."
  }
];

interface TrustGridProps {
  startIndex: number;
  className?: string;
}

export function TrustGrid({ startIndex, className }: TrustGridProps) {
  const items = allTrustItems.slice(startIndex, startIndex + 3);

  return (
    <section className={cn("py-12 bg-black/20 border-y border-white/5", className)}>
      <div className="max-w-[100vw] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-white/5 border-white/5">
          {items.map((item, index) => (
            <div 
              key={index} 
              className="group p-8 sm:p-12 bg-[#09090b] transition-all hover:bg-zinc-900/50 flex flex-col items-center text-center"
            >
              <div className="space-y-6 max-w-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-all duration-500 shadow-xl group-hover:shadow-red-600/20">
                    <item.icon className="size-6" />
                  </div>
                  <h3 className="text-sm font-black italic uppercase tracking-[0.2em] text-white group-hover:text-red-500 transition-colors">
                    {item.title}
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium uppercase tracking-wider">
                  {item.description}
                </p>
                
                {/* Decorative dots */}
                <div className="pt-2 flex justify-center gap-1.5 overflow-hidden">
                  <div className="w-8 h-[1px] bg-red-600/40 group-hover:w-16 transition-all duration-700"></div>
                  <div className="w-1 h-1 rounded-full bg-red-600/40"></div>
                  <div className="w-8 h-[1px] bg-zinc-800"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
