/**
 * ProntaApertura — Landing "Próximamente"
 * 100% Responsive:
 *  - Móvil (portrait): object-cover centrado en el texto central
 *  - Tablet / Desktop: object-contain muestra la imagen completa
 * Para seguir desarrollando la tienda, accede a /dev-store (ruta secreta).
 */
export default function ProntaApertura() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/*
        — Móvil portrait  → object-cover + object-center: llena toda la pantalla.
          El texto central ("¡MUY PRONTO ABRIMOS NUESTRA WEB!") siempre visible.
        — Tablet / Desktop → object-contain: imagen completa sin recorte.
        La técnica de usar <picture> + media query garantiza el mejor resultado
        visual sin JavaScript.
      */}
      <img
        src="/Imagenes/landing.png"
        alt="HoloCards — Próximamente, abrimos nuestra web de TCG online"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',          /* móvil: cubre toda la pantalla */
          objectPosition: 'center center',
          display: 'block',
        }}
        /* En pantallas ≥ 768px cambiamos a contain via inline media override */
        onLoad={(e) => {
          const img = e.currentTarget;
          const applyFit = () => {
            if (window.innerWidth >= 768) {
              img.style.objectFit = 'contain';
              img.style.padding = '0';
            } else {
              img.style.objectFit = 'cover';
              img.style.padding = '0';
            }
          };
          applyFit();
          window.addEventListener('resize', applyFit);
        }}
      />
    </div>
  );
}
