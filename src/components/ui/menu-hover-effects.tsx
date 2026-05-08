import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const menuItems = [
  { label: 'Home', path: '/' },
  { label: 'MegaEvolucion', path: '/#explore' },
  { label: 'Escarlata y Purpura', path: '/#explore' },
  { label: 'Espada y Escudo', path: '/#explore' },
  { label: 'Vintage', path: '/#explore' },
  { label: 'Pokemon', path: '/#explore' }
];

export default function NavMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="absolute z-50 w-full flex justify-center pt-6">
      {/* Mobile menu toggle button */}
      <button 
        onClick={toggleMenu}
        className="md:hidden absolute top-6 right-6 z-50 p-2 bg-black/50 backdrop-blur-md rounded-lg border border-white/10"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
      >
        <div className={`w-6 h-0.5 bg-white mb-1.5 transition-transform duration-300 ${isMenuOpen ? 'transform rotate-45 translate-y-2' : ''}`}></div>
        <div className={`w-6 h-0.5 bg-white mb-1.5 transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
        <div className={`w-6 h-0.5 bg-white transition-transform duration-300 ${isMenuOpen ? 'transform -rotate-45 -translate-y-2' : ''}`}></div>
      </button>
      
      {/* Menu container */}
      <div className={`
        flex items-center justify-center
        md:block md:w-auto
        ${isMenuOpen ? 'fixed inset-0 bg-black z-40' : 'hidden md:block'}
      `}>
        <ul className={`
          flex flex-col items-center space-y-6
          md:flex-row md:space-y-0 md:space-x-1 md:justify-center
          lg:space-x-4 bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-full
        `}>
          {menuItems.map((item) => (
            <li key={item.label} className="list-none">
              <Link 
                to={item.path} 
                className="relative inline-block group"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (item.path.startsWith('/#')) {
                    const id = item.path.split('#')[1];
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {/* Link text */}
                <span className="
                  relative z-10 block uppercase text-white/70
                  font-sans font-black transition-colors duration-300 
                  group-hover:text-white
                  text-lg py-2 px-4
                  md:text-[10px] md:py-2 md:px-6
                  lg:text-[11px] lg:tracking-[0.2em]
                ">
                  {item.label}
                </span>
                
                {/* Top & bottom border animation - Red Accent */}
                <span className="
                  absolute inset-0 border-t border-b border-red-600
                  transform scale-y-[1.5] opacity-0 
                  transition-all duration-300 origin-center
                  group-hover:scale-y-100 group-hover:opacity-100
                  rounded-full
                " />
                
                {/* Background fill animation - Red Accent */}
                <span className="
                  absolute inset-0 bg-red-600
                  transform scale-0 opacity-0
                  transition-all duration-300 origin-center
                  group-hover:scale-100 group-hover:opacity-100
                  rounded-full -z-0
                " />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
