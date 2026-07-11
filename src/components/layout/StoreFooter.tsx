import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Layers, 
  Mail, 
  Phone, 
  MapPin,
  ArrowUpRight
} from 'lucide-react';

export const StoreFooter = () => {
  return (
    <footer className="bg-card border-t border-border pt-20 pb-10 transition-colors">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/dev-store" className="flex items-center gap-3 group">
              <div className="relative">
                 <Layers className="w-8 h-8 text-foreground transform -rotate-12 group-hover:rotate-0 transition-transform" />
                 <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary/20 rounded-sm" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic text-foreground">
                TCG <span className="text-muted-foreground">STORE</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs uppercase font-bold tracking-tight">
              El refugio definitivo para coleccionistas en Canarias. Piezas auténticas, envíos locales y pasión por el TCG.
            </p>
            <div className="flex gap-4">
              <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all border border-border">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Twitter" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all border border-border">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all border border-border">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Navegación</h3>
            <ul className="space-y-4">
              <li><Link to="/dev-store" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Inicio <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100" /></Link></li>
              <li><Link to="/dev-store/catalogo" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Catálogo Completo</Link></li>
              <li><Link to="/dev-store/perfil" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Mi Cuenta</Link></li>
              <li><Link to="/dev-store/carrito" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Carrito</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Legal & Soporte</h3>
            <ul className="space-y-4">
              <li><Link to="/terminos" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest">Términos y Condiciones</Link></li>
              <li><Link to="/privacidad" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest">Política de Privacidad</Link></li>
              <li><Link to="/envios" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest">Envíos y Devoluciones</Link></li>
              <li><Link to="/contacto" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest">Contacto Directo</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Contacto</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                <Mail className="w-4 h-4 text-primary" />
                info@sasorilabs.io
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                <Phone className="w-4 h-4 text-primary" />
                +34 600 000 000
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                <MapPin className="w-4 h-4 text-primary" />
                Santa Cruz de Tenerife, España
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            © 2026 Sasori Labs. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sistemas Operativos</span>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 italic">Built by Antigravity</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
