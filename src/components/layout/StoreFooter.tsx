import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Layers, Mail, Phone, MapPin } from 'lucide-react';

export const StoreFooter = () => {
  return (
    <footer className="bg-card border-t border-border pt-20 pb-10 transition-colors">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <Layers className="w-8 h-8 text-foreground" />
              <span className="text-xl font-black uppercase italic">HoloCards <span className="text-muted-foreground">Store</span></span>
            </Link>
            <p className="text-muted-foreground text-sm uppercase font-bold">
              El refugio definitivo para coleccionistas en Canarias. Piezas auténticas y envíos garantizados.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Navegación</h3>
            <ul className="space-y-4">
              <li><Link to="/" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Inicio</Link></li>
              <li><Link to="/catalogo" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Catálogo Completo</Link></li>
              <li><Link to="/perfil" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Mi Cuenta</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Legal & Soporte</h3>
            <ul className="space-y-4">
              <li><Link to="/sobre-nosotros?section=terminos" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Términos y Condiciones</Link></li>
              <li><Link to="/sobre-nosotros?section=privacidad" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Política de Privacidad</Link></li>
              <li><Link to="/sobre-nosotros?section=envios" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Envíos y Devoluciones</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Contacto</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase"><Mail className="w-4 h-4 text-primary" /> soporte@holocardscanarias.com</li>
              <li className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase"><MapPin className="w-4 h-4 text-primary" /> Canarias, España</li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-border flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground">
          <p>&copy; 2026 HoloCards Canarias. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};