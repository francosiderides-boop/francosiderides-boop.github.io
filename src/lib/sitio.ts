import datos from '../../config/sitio.json';

export const sitio = datos;

/** Enlace a WhatsApp con mensaje prellenado. */
export function enlaceWhatsApp(mensaje: string = sitio.contacto.mensajeWhatsapp) {
  const numero = sitio.contacto.whatsapp.replace(/\D/g, '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/** Enlace mailto con asunto prellenado. */
export function enlaceEmail(asunto = `Consulta desde el portfolio de ${sitio.nombre}`) {
  return `mailto:${sitio.contacto.email}?subject=${encodeURIComponent(asunto)}`;
}

/**
 * Elige texto negro o blanco sobre el color de acento según su luminosidad,
 * para que los botones se lean bien aunque cambies el color en sitio.json.
 */
export function colorSobreAcento(hex: string = sitio.colorAcento) {
  const limpio = hex.replace('#', '');
  const completo = limpio.length === 3 ? limpio.replace(/./g, (c) => c + c) : limpio;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(completo.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminancia = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminancia > 0.3 ? '#111111' : '#ffffff';
}

export const navegacion = [
  { etiqueta: 'Inicio', href: '/' },
  { etiqueta: 'Trabajos', href: '/trabajos/' },
  { etiqueta: 'Sobre mí', href: '/sobre-mi/' },
  { etiqueta: 'Contacto', href: '/contacto/' },
];
