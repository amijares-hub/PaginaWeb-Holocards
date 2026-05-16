import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Copy, 
  CreditCard, 
  Phone, 
  ShoppingBag,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { StoreNavbar } from '../components/layout/StoreNavbar';

export default function SuccessPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const shortId = orderId?.slice(0, 8).toUpperCase();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Podríamos añadir un mini toast aquí
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden transition-colors duration-500">
      <StoreNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Animated Success Icon */}
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)] relative"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
            <motion.div 
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border-2 border-emerald-500"
            />
          </motion.div>

          <div className="space-y-3">
            <h1 className="text-4xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none text-foreground">
              ¡Pedido <span className="text-primary">Registrado!</span>
            </h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.2em]">
              Tu orden <span className="text-foreground">#{shortId}</span> ha sido guardada en nuestra bóveda.
            </p>
          </div>

          {/* Payment Instructions Container */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-card border border-border rounded-[3rem] p-8 lg:p-12 backdrop-blur-xl relative overflow-hidden shadow-2xl"
          >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 text-primary">
                  <CreditCard className="w-6 h-6" />
                  <h2 className="text-xl font-black uppercase italic tracking-widest">Instrucciones de Pago</h2>
                </div>
                <p className="text-muted-foreground text-xs font-medium leading-relaxed max-w-md mx-auto">
                  Para que nuestro equipo empiece a preparar tu paquete de colección, por favor realiza el pago mediante una de las siguientes opciones:
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Option A: Bizum */}
                <div className="bg-muted/50 border border-border p-6 rounded-3xl space-y-4 hover:border-primary/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-black uppercase tracking-widest text-xs text-foreground">Pago vía Bizum</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase text-left">Número de Teléfono</p>
                    <div className="flex items-center justify-between bg-muted px-4 py-3 rounded-xl">
                      <span className="text-lg font-mono font-bold tracking-tighter text-foreground">600 000 000</span>
                      <button 
                        onClick={() => copyToClipboard('600000000')} 
                        title="Copiar número de Bizum"
                        className="p-2 hover:bg-background/20 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Option B: Transferencia */}
                <div className="bg-muted/50 border border-border p-6 rounded-3xl space-y-4 hover:border-blue-500/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="font-black uppercase tracking-widest text-xs text-foreground">Transferencia</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase text-left">Número de IBAN</p>
                    <div className="flex items-center justify-between bg-muted px-4 py-3 rounded-xl">
                      <span className="text-sm font-mono font-bold tracking-tighter truncate mr-2 text-foreground">ES21 0000 0000 0000 0000 0000</span>
                      <button 
                        onClick={() => copyToClipboard('ES2100000000000000000000')} 
                        title="Copiar número de IBAN"
                        className="p-2 hover:bg-background/20 rounded-lg transition-colors shrink-0"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Crucial Note */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] text-foreground font-black uppercase tracking-widest">Importante: Concepto del Pago</p>
                  <p className="text-[9px] text-muted-foreground font-medium leading-relaxed uppercase tracking-wider">
                    Es vital que pongas <span className="text-foreground font-bold">#{shortId}</span> en el concepto para que podamos identificar tu pago al instante. Una vez recibido, procesaremos tu envío.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
            <button 
              onClick={() => navigate('/')}
              className="w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-foreground/90 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              Volver a la Tienda
            </button>
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Compra Protegida
            </div>
          </div>
        </div>
      </main>
    </div>

  );
}
