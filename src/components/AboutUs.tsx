"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { 
  ShieldCheck, 
  Award, 
  ArrowRight, 
  X, 
  Info, 
  FileText, 
  Scale, 
  Lock, 
  Truck 
} from "lucide-react"
import HeaderV2 from "./layout/HeaderV2"

interface SectionData {
  id: string
  label: string
  title: string
  highlight: string
  icon: React.ReactNode
  shortDescription: string
  fullContent: React.ReactNode
  features: { icon: React.ReactNode; title: string; subtitle: string }[]
}

const SECTIONS: SectionData[] = [
  {
    id: "sobre-nosotros",
    label: "Sobre Nosotros",
    title: "SOBRE",
    highlight: "HOLOCARDS",
    icon: <Info className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "En HoloCards vivimos y respiramos la pasión por los Trading Card Games. Nacimos con el objetivo de ofrecer a entrenadores y coleccionistas un espacio seguro, rápido y especializado para conseguir sus productos favoritos de Pokémon TCG, Magic The Gathering y One Piece TCG.",
    features: [
      { icon: <ShieldCheck className="w-4 h-4" />, title: "100% OFICIAL", subtitle: "Stock verificado" },
      { icon: <Award className="w-4 h-4" />, title: "ENVÍOS RÁPIDOS", subtitle: "Sin aduanas sorpresa" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <p>
          En <strong className="text-yellow-400">HoloCards Canarias</strong> vivimos y respiramos la pasión por los Trading Card Games. Nuestra tienda nació con el compromiso de conectar a jugadores y coleccionistas con los productos más exclusivos y buscados del mercado.
        </p>
        <p>
          Trabajamos de forma directa con distribuidores autorizados para garantizar que cada caja de sobres, booster pack, blister o accesorio que llega a tus manos sea 100% original, oficial y sellado de fábrica.
        </p>
        <p>
          Especializados en envíos exclusivos a todas las Islas Canarias, garantizamos empaquetados ultra protegidos para que tus cartas y colecciones lleguen en estado impecable (*Mint Condition*).
        </p>
      </div>
    )
  },
  {
    id: "terminos",
    label: "Términos y Condiciones",
    title: "TÉRMINOS Y",
    highlight: "CONDICIONES",
    icon: <FileText className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "Regulación general sobre el acceso, compras de productos TCG, preventas, uso permitido de la tienda y límites de compra en productos demandados.",
    features: [
      { icon: <ShieldCheck className="w-4 h-4" />, title: "COMPRA SEGURA", subtitle: "Pasarelas cifradas SSL" },
      { icon: <Award className="w-4 h-4" />, title: "PREVENTAS REGULADAS", subtitle: "Sujetas a distribución" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <h4 className="text-white font-bold text-base">1. Objeto y Usuarios</h4>
        <p>
          Las presentes condiciones regulan el uso del sitio web HOLOCARDS CANARIAS dedicado a la venta de TCG. El acceso es libre. Para comprar o registrarse será necesario facilitar datos veraces. Menores de 16 años deberán contar con autorización de sus padres o tutores.
        </p>
        <h4 className="text-white font-bold text-base">2. Productos y Preventas</h4>
        <p>
          Las imágenes tienen carácter ilustrativo; los fabricantes pueden introducir variaciones de embalaje. Las preventas están sujetas a disponibilidad del distribuidor. En productos de alta demanda se podrán establecer límites de compra por usuario.
        </p>
        <h4 className="text-white font-bold text-base">3. Responsabilidad</h4>
        <p>
          HOLOCARDS CANARIAS no será responsable de interrupciones del servicio, errores derivados de terceros o causas de fuerza mayor. Estas condiciones podrán modificarse en cualquier momento.
        </p>
      </div>
    )
  },
  {
    id: "avisos",
    label: "Avisos Legales",
    title: "AVISOS",
    highlight: "LEGALES",
    icon: <Scale className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "Información fiscal oficial del titular del sitio web, domicilio, NIF de contacto y derechos de propiedad intelectual de marcas registradas.",
    features: [
      { icon: <ShieldCheck className="w-4 h-4" />, title: "TITULAR FISCAL", subtitle: "Elisa González Rojas" },
      { icon: <Award className="w-4 h-4" />, title: "CONTACTO OFICIAL", subtitle: "soporte@holocardscanarias.com" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <h4 className="text-white font-bold text-base">1. Datos Identificativos del Titular</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Titular:</strong> Elisa González Rojas</li>
          <li><strong>NIF:</strong> 51148236P</li>
          <li><strong>Domicilio:</strong> CTRA Monte Las Mercedes N127</li>
          <li><strong>Email:</strong> soporte@holocardscanarias.com</li>
          <li><strong>Dominio:</strong> holocardscanarias.com</li>
        </ul>
        <h4 className="text-white font-bold text-base">2. Propiedad Intelectual</h4>
        <p>
          Todos los contenidos del sitio web son propiedad de HOLOCARDS CANARIAS o de sus respectivos titulares. Queda prohibida su reproducción sin autorización. Pokémon, Magic The Gathering, One Piece y sus logotipos pertenecen a sus respectivos fabricantes.
        </p>
      </div>
    )
  },
  {
    id: "privacidad",
    label: "Política de Privacidad y Cookies",
    title: "PRIVACIDAD Y",
    highlight: "COOKIES",
    icon: <Lock className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "Protección de datos conforme al Reglamento (UE) 2016/679, tratamiento de datos identificativos, derechos de usuario y uso de cookies técnicas y analíticas.",
    features: [
      { icon: <ShieldCheck className="w-4 h-4" />, title: "RGPD / LOPD", subtitle: "Protección de datos" },
      { icon: <Award className="w-4 h-4" />, title: "GOOGLE ANALYTICS", subtitle: "Cookies técnicas/analíticas" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <h4 className="text-white font-bold text-base">1. Finalidad y Datos Tratados</h4>
        <p>
          Tratamos datos identificativos, de contacto y de envío para gestión de pedidos, cuentas, incidencias, comunicaciones comerciales (con consentimiento) y cumplimiento legal. Los datos bancarios son gestionados directamente por pasarelas seguras (PayPal/Entidades bancarias).
        </p>
        <h4 className="text-white font-bold text-base">2. Destinatarios y Conservación</h4>
        <p>
          Los datos se comunicarán a empresas de transporte, proveedores tecnológicos, PayPal, bancos y Administraciones Públicas por obligación legal. Se conservarán durante la relación contractual y los plazos legales requeridos.
        </p>
        <h4 className="text-white font-bold text-base">3. Ejercicio de Derechos</h4>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, limitación y portabilidad escribiendo a <strong className="text-yellow-400">marketing@holocardscanarias.com</strong>. También tienes derecho a reclamar ante la AEPD.
        </p>
        <h4 className="text-white font-bold text-base">4. Uso de Cookies</h4>
        <p>
          Utilizamos cookies técnicas necesarias y Google Analytics para medir la navegación con previo consentimiento del usuario.
        </p>
      </div>
    )
  },
  {
    id: "envios",
    label: "Política de Envíos y Devoluciones",
    title: "ENVÍOS Y",
    highlight: "DEVOLUCIONES",
    icon: <Truck className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "Envíos exclusivos a las Islas Canarias. Tarifas de 4,95€, envíos gratis a partir de 100€, plazos de 24/72h y política transparente sobre apertura de sobres.",
    features: [
      { icon: <Truck className="w-4 h-4" />, title: "ENVÍOS CANARIAS", subtitle: "Tenerife 24-48h / Resto 24-72h" },
      { icon: <Award className="w-4 h-4" />, title: "ENVÍO GRATIS >100€", subtitle: "Tarifa estándar 4,95€" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <h4 className="text-white font-bold text-base">1. Ámbito, Plazos y Tarifas</h4>
        <p>
          Realizamos envíos <strong>exclusivamente a todas las Islas Canarias</strong>. 
          <br />• <strong>Tenerife:</strong> 24 a 48 horas laborables.
          <br />• <strong>Resto de Islas Canarias:</strong> 24 a 72 horas laborables.
          <br />Coste estándar de envío: <strong>4,95 €</strong>. ¡Envío <strong>GRATIS</strong> en pedidos superiores a 100 €!
        </p>
        <h4 className="text-white font-bold text-base">2. Recepción e Incidencias</h4>
        <p>
          Si el paquete presenta daños visibles por el transporte, indícalo al transportista y escríbenos cuanto antes a <strong>soporte@holocardscanarias.com</strong>.
        </p>
        <h4 className="text-white font-bold text-base">3. Devoluciones y Desistimiento</h4>
        <p>
          Productos sin abrir pueden devolverse en un plazo de 14 días si están en perfecto estado y con su embalaje original. <strong>No se aceptan devoluciones de productos abiertos o manipulados</strong> salvo defecto de fabricación comprobable.
        </p>
        <h4 className="text-white sm:text-yellow-400 font-bold text-base bg-yellow-400/10 p-3 rounded-xl border border-yellow-400/20">
          🎰 Recordatorio Coleccionista: El "Factor Sorpresa"
        </h4>
        <p className="italic text-gray-300">
          Todos queremos abrir un sobre y sacar la carta más rara. Sin embargo, un "mal drop" no constituye un defecto del producto. No aceptamos devoluciones de sobres o cajas abiertas porque la suerte no haya acompañado. ¡La emoción del coleccionismo está en la sorpresa!
        </p>
      </div>
    )
  }
]

export function AboutUs() {
  const [activeTabId, setActiveTabId] = useState<string>("sobre-nosotros")
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const sectionParam = searchParams.get("section")
    if (sectionParam && SECTIONS.some(s => s.id === sectionParam)) {
      setActiveTabId(sectionParam)
    }
  }, [searchParams])

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  const activeSection = SECTIONS.find((s) => s.id === activeTabId) || SECTIONS[0]

  return (
    <>
      <HeaderV2 />
      <div className="w-full min-h-[calc(100vh-73px)] py-4 sm:py-6 bg-[#050914] text-white flex flex-col justify-center relative overflow-hidden">
        
        {/* FONDO DE PÁGINA */}
        <img
          src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Fondos/Fondo.webp"
          alt="Fondo Holocards"
          className="absolute inset-0 w-full h-full object-cover opacity-40 z-0 pointer-events-none mix-blend-screen"
        />

        <div className="absolute -top-20 -left-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* BOTONES EXTENDIDOS A LO ANCHO SIN FLECHAS */}
        <div className="relative z-20 w-full px-4 sm:px-8 mt-2 sm:mt-4 flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-6xl w-full">
            {SECTIONS.map((section) => {
              const isSelected = activeTabId === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTabId(section.id)}
                  className={`relative px-4 sm:px-6 h-[38px] sm:h-[46px] md:h-[48px] rounded-full text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "text-black translate-y-[2px]"
                      : "bg-gradient-to-b from-[#1c2e4a] to-[#0a1222] border border-[#2c446b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_0_#02040a,0_6px_10px_rgba(0,0,0,0.6)] text-gray-300 hover:text-white hover:brightness-110 active:translate-y-[2px]"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-about-tab-bg"
                      className="absolute inset-0 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.3),0_0_15px_rgba(250,204,21,0.6)] border border-yellow-200"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                    {section.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* BLOQUES BAJADOS Y CENTRADOS */}
        <main className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 mt-6 lg:mt-10 mb-4">
          <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            
            {/* BLOQUE 1 (IZQUIERDA) - LOGO OFICIAL DE LA EMPRESA (SIN FRAME) */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full lg:w-[28%] h-48 lg:h-auto flex items-center justify-center relative shrink-0"
            >
              <motion.img
                src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Iso%20Transparente.png"
                alt="Logo HoloCards Iso"
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                className="w-full h-full max-h-[280px] lg:max-h-[320px] object-contain filter drop-shadow-[0_0_25px_rgba(250,204,21,0.35)] pointer-events-none"
              />
            </motion.div>

            {/* BLOQUE 2 (CENTRO) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="w-full lg:w-[46%] bg-[#0a1628]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between relative overflow-hidden h-full max-h-[480px]"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80" />

              <div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight leading-tight text-white mb-3">
                      {activeSection.title}{" "}
                      <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                        {activeSection.highlight}
                      </span>
                    </h1>

                    <p className="text-gray-300 text-xs sm:text-sm font-light leading-relaxed mb-6">
                      {activeSection.shortDescription}
                    </p>

                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_25px_rgba(250,204,21,0.6)] transition-all duration-300 active:scale-95"
                    >
                      Ver Más <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* CARACTERÍSTICAS BASE */}
              <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/10">
                {activeSection.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shrink-0">
                      {feat.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] sm:text-[11px] font-black text-white uppercase leading-none">
                        {feat.title}
                      </p>
                      <p className="text-[9px] text-gray-400 font-light mt-0.5">
                        {feat.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* BLOQUE 3 (DERECHA) - VUELVE A LA IMAGEN ENMARCADA ORIGINAL */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full lg:w-[28%] h-48 lg:h-auto flex items-center justify-center shrink-0"
            >
              <div className="relative w-full max-w-[280px] lg:max-w-none aspect-[3/4] max-h-[380px] bg-[#030c1a] rounded-2xl lg:rounded-[2rem] p-3 border border-yellow-400/40 shadow-[0_0_40px_rgba(250,204,21,0.2)] overflow-hidden group">
                <div className="w-full h-full rounded-xl lg:rounded-[1.5rem] bg-[#0a1628]/80 border border-white/10 overflow-hidden relative flex items-center justify-center p-4">
                  <img
                    src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Promo.webp"
                    alt="Enmarcado HoloCards"
                    className="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-400/50 text-[9px] font-black uppercase tracking-widest text-yellow-400">
                    Garantía HoloCards
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </main>

        {/* POP-UP MODAL */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 260, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl max-h-[85vh] bg-[#0a1628] border border-yellow-400/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(250,204,21,0.3)] flex flex-col justify-between overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500" />

                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
                      {activeSection.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                      {activeSection.label}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 max-h-[50vh] hide-scrollbar my-2">
                  {activeSection.fullContent}
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    HoloCards TCG Store
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  )
}

export default AboutUs;