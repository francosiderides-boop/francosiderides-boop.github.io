// Convierte las imágenes descargadas a WebP en varios tamaños dentro de /public/proyectos/<slug>/
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Guarda una imagen como nombre.webp (la más grande) y nombre-480.webp, nombre-960.webp, etc.
 * Devuelve la ruta pública ("/proyectos/slug/nombre.webp").
 */
export async function guardarImagen(buffer, { carpetaPublica, slug, nombre, tamanos }) {
  const destino = path.join(carpetaPublica, 'proyectos', slug);
  fs.mkdirSync(destino, { recursive: true });

  const imagen = sharp(buffer, { animated: false }).rotate(); // .rotate() respeta la orientación de la cámara
  const { width = 0 } = await imagen.metadata();
  if (!width) throw new Error('el archivo no es una imagen válida');

  const maximo = Math.min(width, Math.max(...tamanos));
  await imagen.clone().resize({ width: maximo, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(destino, `${nombre}.webp`));
  for (const ancho of tamanos.filter((t) => t < maximo)) {
    await imagen.clone().resize({ width: ancho }).webp({ quality: 78 }).toFile(path.join(destino, `${nombre}-${ancho}.webp`));
  }
  return `/proyectos/${slug}/${nombre}.webp`;
}
