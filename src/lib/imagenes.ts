import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Anchos que se generan para el srcset (teléfono, tablet, computadora). */
export const ANCHOS = [480, 960, 1600];

export interface ImagenLista {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

// Todas las imágenes que Astro puede optimizar: las de cada proyecto y las de /config/imagenes
const locales = import.meta.glob<ImageMetadata>(
  ['/content/proyectos/**/*.{jpg,jpeg,png,webp,avif}', '/config/imagenes/*.{jpg,jpeg,png,webp,avif}'],
  { eager: true, import: 'default' },
);

/**
 * Prepara una imagen para mostrarla con srcset.
 *  - "./foto.jpg"  → archivo junto al proyecto; Astro genera WebP en varios tamaños.
 *  - "/proyectos/slug/foto.webp" → archivo en /public (los importados de Behance),
 *    que ya trae sus versiones foto-480.webp, foto-960.webp, etc.
 * @param carpeta carpeta desde la que se resuelven las rutas relativas (ej. "/content/proyectos/lumbre")
 */
export async function prepararImagen(src: string, carpeta: string, anchos = ANCHOS): Promise<ImagenLista | null> {
  if (!src) return null;

  // Imagen ya optimizada en /public
  if (src.startsWith('/')) return imagenPublica(src);

  // Enlace externo: se muestra tal cual (no recomendado)
  if (/^https?:\/\//.test(src)) return { src, srcset: '', width: 1600, height: 900 };

  const clave = path.posix.join(carpeta, src);
  const meta = locales[clave];
  if (!meta) {
    console.warn(`[imagenes] No se encontró la imagen "${src}" en ${carpeta}`);
    return null;
  }
  const validos = anchos.filter((w) => w < meta.width).concat(meta.width > Math.max(...anchos) ? [] : [meta.width]);
  const img = await getImage({ src: meta, widths: validos, format: 'webp', quality: 78 });
  return {
    src: img.src,
    srcset: img.srcSet.attribute,
    width: meta.width,
    height: meta.height,
  };
}

const cachePublicas = new Map<string, ImagenLista | null>();

async function imagenPublica(src: string): Promise<ImagenLista | null> {
  if (cachePublicas.has(src)) return cachePublicas.get(src)!;
  const archivo = path.join(process.cwd(), 'public', src);
  if (!fs.existsSync(archivo)) {
    console.warn(`[imagenes] No existe public${src}`);
    cachePublicas.set(src, null);
    return null;
  }
  const { dir, name, ext } = path.parse(archivo);
  // Busca las variantes nombre-480.webp, nombre-960.webp...
  const variantes = fs
    .readdirSync(dir)
    .map((f) => f.match(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)${ext.replace('.', '\\.')}$`)))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ ancho: Number(m[1]), url: path.posix.join(path.posix.dirname(src), m[0]) }))
    .sort((a, b) => a.ancho - b.ancho);
  const { width = 1600, height = 900 } = await sharp(archivo).metadata();
  const resultado = {
    src,
    srcset: [...variantes.map((v) => `${v.url} ${v.ancho}w`), `${src} ${width}w`].join(', '),
    width,
    height,
  };
  cachePublicas.set(src, resultado);
  return resultado;
}

/** Imagen para compartir en redes (Open Graph): 1200 px de ancho en JPG. */
export async function imagenParaCompartir(src: string, carpeta: string): Promise<string | undefined> {
  if (!src) return undefined;
  if (src.startsWith('/') || /^https?:\/\//.test(src)) return src;
  const meta = locales[path.posix.join(carpeta, src)];
  if (!meta) return undefined;
  const img = await getImage({ src: meta, width: Math.min(1200, meta.width), format: 'jpg', quality: 80 });
  return img.src;
}

/** Carpeta de un proyecto, a partir de la ruta de su archivo. */
export function carpetaDe(filePath: string | undefined) {
  return '/' + path.posix.dirname(filePath ?? '');
}

/** Normaliza una imagen escrita como texto o como { src, alt }. */
export function datosImagen(img: string | { src: string; alt?: string }) {
  return typeof img === 'string' ? { src: img, alt: '' } : { src: img.src, alt: img.alt ?? '' };
}
