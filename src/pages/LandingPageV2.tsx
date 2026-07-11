import React from 'react';
import HeaderV2 from '../components/layout/HeaderV2';
import AnnouncementBar from '../components/layout/AnnouncementBar';
import PromoBanner from '../components/ui/PromoBanner';
import { motion } from 'motion/react';
import { Truck } from 'lucide-react';
import ChevronDivider from '../components/ui/ChevronDivider';

const BUCKET_URL = "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/";
const BUCKET_LOGO_URL = "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagen%20De%20Logo%20de%20Empresa/";

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* ─── ANUNCIO + HEADER ─── */}
      <AnnouncementBar />
      <HeaderV2 />

      <main>

        {/* ─── HERO SECTION: solo el logo, nada más ─── */}
        <div className="w-full flex items-center justify-center min-h-[40vh] lg:min-h-[50vh] py-12">
          <img
            src={`${BUCKET_LOGO_URL}LogoHeroSection.png`}
            alt="Holocards"
            className="w-full max-w-3xl lg:max-w-5xl object-contain mx-auto drop-shadow-2xl"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

          {/* ─── TÍTULOS ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-white uppercase">
              TIENDA ONLINE DE TCG
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto">
              Selecciona tu TCG de preferencia
            </p>
          </motion.div>

          {/* ─── SEPARADOR V-SHAPE ARRIBA (apunta hacia abajo) ─── */}
          <ChevronDivider direction="down" />

          {/* ─── MATRIZ TCG (Botones Neón) ─── */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-10 mb-12">

            {/* Pokémon TCG */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center gap-6"
            >
              <button className="w-48 h-48 rounded-full bg-gray-900 border-2 border-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-blue-500/50 hover:shadow-[0_0_40px_rgba(0,191,255,0.8)] group relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <img src={`${BUCKET_URL}Recurso%2021.png`} alt="Pokemon" className="w-full h-full object-cover rounded-full z-10" />
              </button>
              <span className="font-bold text-lg tracking-wider text-gray-300 uppercase">POKÉMON TCG</span>
            </motion.div>

            {/* Magic The Gathering */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center gap-6"
            >
              <button className="w-48 h-48 rounded-full bg-gray-900 border-2 border-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-blue-500/50 hover:shadow-[0_0_40px_rgba(0,191,255,0.8)] group relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <img src={`${BUCKET_URL}Recurso%2020.png`} alt="Magic" className="w-full h-full object-cover rounded-full z-10" />
              </button>
              <span className="font-bold text-lg tracking-wider text-gray-300 uppercase">MAGIC THE GATHERING</span>
            </motion.div>

            {/* One Piece Card Game */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center gap-6"
            >
              <button className="w-48 h-48 rounded-full bg-gray-900 border-2 border-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-blue-500/50 hover:shadow-[0_0_40px_rgba(0,191,255,0.8)] group relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <img src={`${BUCKET_URL}Recurso%2015.png`} alt="One Piece" className="w-full h-full object-cover rounded-full z-10" />
              </button>
              <span className="font-bold text-lg tracking-wider text-gray-300 uppercase">ONE PIECE CARD GAME</span>
            </motion.div>

          </div>

          {/* ─── SEPARADOR ^ ABAJO (apunta hacia arriba) ─── */}
          <ChevronDivider direction="up" />

          {/* ─── DIVISOR ─── */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-16 opacity-50"></div>

          {/* ─── TRUST BADGES ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 bg-[#0d1117] rounded-xl p-10 border border-gray-800/60 shadow-lg mx-auto w-full"
          >
            <div className="flex flex-col items-center text-center px-4 lg:border-r border-gray-800/60">
              <img src={`${BUCKET_URL}Recurso%2011.png`} alt="Seguro" className="w-14 h-14 object-contain mb-4" />
              <h3 className="font-bold text-white mb-2">100% Seguro</h3>
              <p className="text-sm text-gray-400">Transacciones protegidas</p>
            </div>
            <div className="flex flex-col items-center text-center px-4 lg:border-r border-gray-800/60">
              <img src={`${BUCKET_URL}Recurso%2013.png`} alt="Calidad" className="w-14 h-14 object-contain mb-4" />
              <h3 className="font-bold text-white mb-2">Calidad Asegurada</h3>
              <p className="text-sm text-gray-400">Productos originales</p>
            </div>
            <div className="flex flex-col items-center text-center px-4 lg:border-r border-gray-800/60">
              {/* Replace Truck icon with image if available, else keep generic or use Recurso 12 if that was the truck */}
              <img src={`${BUCKET_URL}Recurso%2012.png`} alt="Envíos" className="w-14 h-14 object-contain mb-4" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <Truck className="w-14 h-14 text-yellow-500 mb-4 hidden" />
              <h3 className="font-bold text-white mb-2">Envíos a Canarias</h3>
              <p className="text-sm text-gray-400">Rápido y sin aduanas sorpresa</p>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <img src={`${BUCKET_URL}Recurso%2025.png`} alt="Stock" className="w-14 h-14 object-contain mb-4" />
              <h3 className="font-bold text-white mb-2">Conoce nuestro Stock</h3>
              <p className="text-sm text-gray-400">Miles de cartas disponibles</p>
            </div>
          </motion.div>

          {/* ─── BANNERS 3D ─── */}
          <div className="mt-32 space-y-32">
            <PromoBanner
              title={<img src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/logo%20pokemon%20tcg.png" alt="Pokémon TCG Logo" className="w-64 object-contain mb-4" />}
              description={
                <>
                  <p className="mb-4">Pokémon Trading Card Game es un juego de cartas y estrategia donde cada jugador forma sus barajas de 60 cartas y batalla contra otros jugadores en épicos combates con sus Pokémon favoritos.</p>
                  <p className="mb-4">¡ Realza la astucia de Mega Lucario o destroza el campo con Mega Charizard Y !</p>
                  <p>Diviértete coleccionando y batallando junto a tus Pokémon favoritos y conviértete en un auténtico entrenador</p>
                </>
              }
              buttonText="VER CATÁLOGO POKÉMON"
              Icon={() => <img src={`${BUCKET_URL}Recurso%2020.png`} className="w-full h-full object-cover" alt="Pokemon 3D" />}
              themeColor="yellow"
            />
            <PromoBanner
              title={<img src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/magic-logo.webp" alt="Magic The Gathering Logo" className="w-64 object-contain mb-4" />}
              description={
                <>
                  <p className="mb-4">Magic es un juego de cartas intercambiables y coleccionables en el que libras partidas repletas de diversión y estrategia con amigos nuevos y conocidos.</p>
                  <p className="mb-4">Magic cuenta con una infinidad de maneras de jugar y tiene algo para todo el mundo, desde los fanáticos de la creación de mundos y los amantes de la narrativa hasta los entusiastas del juego estratégico.</p>
                  <p>¡ Elige tu baraja ideal y adéntrate en esta emocionante aventura !</p>
                </>
              }
              buttonText="VER CATÁLOGO MAGIC"
              Icon={() => <img src={`${BUCKET_URL}Recurso%2016.png`} className="w-full h-full object-cover" alt="Magic 3D" />}
              themeColor="blue"
            />
            <PromoBanner
              title={<img src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/onepiece.png" alt="One Piece Card Game Logo" className="w-64 object-contain mb-4" />}
              description={
                <>
                  <p className="mb-4">One Piece (One Piece Card Game) es un juego de cartas coleccionables (TCG) oficial de Bandai basado en la famosa franquicia creada por Eiichiro Oda.</p>
                  <p className="mb-4">El objetivo es reducir a cero los puntos de vida del Líder rival utilizando personajes, eventos y cartas de energía DON!!</p>
                  <p>Adiciona a Luffy, Nami, Zoro, Sanji, Chopper a tu tripulación y arrasa en épicos combates en la búsqueda del glorioso One Piece.</p>
                </>
              }
              buttonText="VER CATÁLOGO ONE PIECE"
              Icon={() => <img src={`${BUCKET_URL}Recurso%2019.png`} className="w-full h-full object-cover" alt="One Piece 3D" />}
              themeColor="red"
            />
          </div>

        </div>
      </main>
    </div>
  );
}
