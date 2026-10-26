import { getCollection, type CollectionEntry } from 'astro:content';

export type Proyecto = CollectionEntry<'proyectos'>;

/**
 * Devuelve los proyectos ordenados del más nuevo al más viejo.
 * Los borradores (publicado: false) solo aparecen mientras trabajás en local.
 */
export async function obtenerProyectos(): Promise<Proyecto[]> {
  const todos = await getCollection('proyectos', ({ data }) => data.publicado || import.meta.env.DEV);
  return todos.sort((a, b) => b.data.anio - a.data.anio || a.data.titulo.localeCompare(b.data.titulo, 'es'));
}

/** Proyectos para la portada: los marcados como destacados o, si no hay, los más recientes. */
export async function obtenerDestacados(cantidad = 3) {
  const proyectos = await obtenerProyectos();
  const destacados = proyectos.filter((p) => p.data.destacado);
  return (destacados.length ? destacados : proyectos).slice(0, cantidad);
}

/** Texto de categorías para mostrar ("Videoclips · Comerciales"). */
export function textoCategorias(p: Proyecto) {
  return p.data.categorias.length ? p.data.categorias.join(' · ') : 'Sin categoría';
}

/** Convierte una categoría en un valor apto para URL ("Ficción" → "ficcion"). */
export function claveCategoria(categoria: string) {
  return categoria
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
