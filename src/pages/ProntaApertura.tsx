/**
 * ProntaApertura — Landing "Próximamente"
 * Página temporal que muestra la imagen de coming soon a pantalla completa.
 * Para seguir desarrollando la tienda, accede a /dev-store (ruta secreta).
 */
export default function ProntaApertura() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center overflow-hidden">
      {/* 
        object-contain → la imagen nunca se recorta, 
        se adapta a móviles y a monitores grandes. 
      */}
      <img
        src="/Imagenes/landing.png"
        alt="HoloCards - Próximamente"
        className="w-full h-full max-h-screen object-contain p-4"
      />
    </div>
  );
}
