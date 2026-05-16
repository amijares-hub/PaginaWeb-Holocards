import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, ShieldCheck, Scale, FileText, Truck } from 'lucide-react';
import { StoreNavbar } from '../components/layout/StoreNavbar';

const LEGAL_CONTENT: Record<string, any> = {
  terminos: {
    title: "Términos y Condiciones",
    icon: Scale,
    description: "Normativa de uso de la plataforma y acuerdos comerciales."
  },
  privacidad: {
    title: "Política de Privacidad",
    icon: ShieldCheck,
    description: "Tratamiento de datos personales y protección del usuario."
  },
  envios: {
    title: "Envíos y Devoluciones",
    icon: Truck,
    description: "Información logística y garantías de satisfacción."
  }
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? LEGAL_CONTENT[slug] : null;
  const Icon = content?.icon || FileText;

  if (!content) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-black mb-4 uppercase italic">Página no encontrada</h1>
        <Link to="/" className="text-red-500 font-black uppercase tracking-widest text-[10px]">Volver al Inicio</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-red-500/30 overflow-x-hidden">
      <StoreNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-40 pb-20">
        <Link to="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-12">
          <ChevronLeft className="w-4 h-4" /> Volver a la Tienda
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="space-y-6">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-8">
              <Icon className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-4xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none">
              {content.title}
            </h1>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em]">
              Última actualización: Mayo 2026 // Protocolo Legal
            </p>
          </div>

          <div className="prose prose-invert prose-zinc max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-white border-l-4 border-red-600 pl-4">1. Introducción</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Bienvenido a TCG Store, operada por Sasori Labs. Al acceder a nuestro sitio web y utilizar nuestros servicios, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones. Por favor, léalos detenidamente antes de realizar cualquier transacción.
              </p>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-white border-l-4 border-red-600 pl-4">2. Compromiso de Calidad</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 italic text-zinc-300">
                "Nuestra misión es preservar la integridad del coleccionismo en las Islas Canarias, ofreciendo un canal seguro y profesional para todos los entrenadores y magos."
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-white border-l-4 border-red-600 pl-4">3. Limitación de Responsabilidad</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
