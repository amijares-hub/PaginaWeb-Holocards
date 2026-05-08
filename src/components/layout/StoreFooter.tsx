import React from 'react';
import { 
  Twitter, 
  Instagram, 
  Youtube, 
  Linkedin,
  ArrowRight,
  Send
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const StoreFooter = () => {
  return (
    <footer className="bg-[#050505] pt-24 pb-12 border-t border-white/5 selection:bg-red-500/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-20">
          
          {/* Brand Section */}
          <div className="lg:col-span-1 space-y-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-[32px] font-black italic uppercase tracking-tighter leading-none text-red-600 font-retro">
                SASORI LABS
              </h2>
            </div>
            
            <p className="text-[14px] text-zinc-500 leading-relaxed font-medium">
              En Sasori Labs vivimos las cartas coleccionables. 
              Tu búnker nº1 en Canarias para Pokémon TCG, One Piece y más, con envíos rápidos y un equipo que entiende a los coleccionistas de élite.
            </p>

            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                <Send className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Partner Section */}
          <div className="flex flex-col items-center lg:items-start gap-6">
            <div className="bg-[#111] p-6 rounded-3xl border border-white/5 w-full flex flex-col items-center">
               <img 
                src="https://www.cgccards.com/images/cgccards-logo-white.svg" 
                alt="CGC Authorized Dealer" 
                className="h-10 mb-6 brightness-100"
               />
               <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Authorized Dealer</p>
               </div>
            </div>
            <div className="bg-white/5 rounded-full p-8 border border-white/10 w-40 h-40 flex items-center justify-center text-center">
               <div className="flex flex-col">
                 <span className="text-[18px] font-black italic text-white uppercase leading-none font-retro">TF_GC</span>
                 <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest font-retro pt-1">Sasori Awards</span>
               </div>
            </div>
          </div>

          {/* Navigation Sections */}
          <div className="space-y-8">
            <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-red-600 mb-8">TIENDA</h4>
            <ul className="space-y-4">
              {['Atención al cliente', '¿Quiénes somos?', 'Preguntas frecuentes', 'Entrega local Salou', 'Compramos tus cartas', 'Apertura en Directo', 'Atención al Cliente en Directo', 'Máquina Vending TCG'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[14px] text-zinc-500 hover:text-red-600 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-8">
            <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-red-600 mb-8">CATEGORÍAS</h4>
            <ul className="space-y-4">
              {['Cartas Pokémon', 'Cajas de Sobres', 'Cajas Temáticas', 'One Piece TCG', 'Magic: The Gathering', 'Novedades y Lanzamientos', 'Productos en Precompra', 'Accesorios'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[14px] text-zinc-500 hover:text-red-600 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Section */}
          <div className="space-y-8">
            <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-red-600 mb-8">OFERTAS Y NOVEDADES</h4>
            <div className="space-y-6">
              <p className="text-[14px] text-zinc-500 leading-relaxed font-medium">
                Sé el primero en enterarte de nuevos lanzamientos. ¡Suscríbete ahora!
              </p>
              
              <div className="flex flex-col gap-4">
                <div className="relative flex">
                  <input 
                    type="email" 
                    placeholder="tu@email.com" 
                    className="flex-1 bg-zinc-900/50 border border-white/10 rounded-l-xl py-4 px-5 text-sm focus:outline-none focus:border-red-600 transition-all"
                  />
                  <button className="bg-red-600 text-white px-6 rounded-r-xl hover:bg-white hover:text-black transition-all group">
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                
                <label className="flex gap-3 cursor-pointer group">
                  <div className="w-5 h-5 border border-white/20 rounded bg-zinc-900 group-hover:border-red-600 transition-colors shrink-0 mt-0.5"></div>
                  <span className="text-[12px] text-zinc-500 leading-tight">
                    Acepto recibir correos electrónicos de marketing y ofertas especiales.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <p className="text-[12px] text-zinc-600 font-medium">
              © 2026 SASORI LABS - El Santuario Pokémon- Todos los derechos reservados.
            </p>
            <div className="flex gap-4 text-[12px] text-zinc-600 font-semibold uppercase tracking-wider">
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Devolución</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
              <a href="#" className="hover:text-white transition-colors">Legal</a>
            </div>
          </div>

          <div className="flex gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" alt="PayPal" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" alt="Visa" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4" alt="Mastercard" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_Pay_logo.svg" className="h-4" alt="Apple Pay" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_logo_%282020%29.svg" className="h-4" alt="Google Pay" />
          </div>
        </div>
      </div>
    </footer>
  );
};
