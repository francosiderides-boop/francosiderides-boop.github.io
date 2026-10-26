import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Una imagen puede escribirse como texto ("./still-1.jpg") o con su texto alternativo.
const imagen = z.union([
  z.string(),
  z.object({ src: z.string(), alt: z.string().optional() }),
]);

// Texto opcional: acepta vacío o null (los proyectos importados dejan campos para COMPLETAR).
const texto = z.string().nullish().transform((v) => v ?? '');

// Cada proyecto es una carpeta dentro de /content/proyectos con un archivo index.md
const proyectos = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './content/proyectos',
    // El identificador es el "slug" del archivo o, si no tiene, el nombre de la carpeta
    generateId: ({ entry, data }) =>
      typeof data.slug === 'string' && data.slug ? data.slug : entry.split('/')[0],
  }),
  schema: z.object({
    titulo: z.string(),
    slug: z.string().optional(),
    anio: z.coerce.number().int(),
    categorias: z.array(z.string()).default([]),
    rol: texto,
    cliente: texto,
    sinopsis: texto,
    // Enlace de Vimeo/YouTube/Instagram o un archivo propio (ej. /proyectos/slug/video.mp4).
    // Para varios videos (ej. una serie en partes) se puede poner una lista.
    video: z
      .union([z.string(), z.array(z.string())])
      .nullish()
      .transform((v) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean)),
    // "vertical" para reels y videos 9:16: cambia el reproductor y la galería
    formato: z.enum(['horizontal', 'vertical']).default('horizontal'),
    duracion: texto,
    miniatura: imagen,
    stills: z.array(imagen).nullish().transform((v) => v ?? []),
    ficha: z
      .object({ camara: texto, equipo: texto })
      .partial()
      .nullish()
      .transform((v) => ({ camara: v?.camara ?? '', equipo: v?.equipo ?? '' })),
    // Datos técnicos extra que quieras sumar (ej. "Lentes", "Formato")
    fichaExtra: z
      .array(z.object({ dato: z.string(), valor: z.string() }))
      .nullish()
      .transform((v) => v ?? []),
    destacado: z.boolean().default(false),
    // Los borradores se ven en modo local pero no se publican
    publicado: z.boolean().default(true),
    // Datos que usa el importador de Behance (no tocar)
    behance: z
      .object({ id: z.coerce.string(), url: z.string() })
      .partial()
      .nullish(),
  }),
});

export const collections = { proyectos };
