#!/usr/bin/env node
// Importa los proyectos de Behance como archivos de /content/proyectos/.
//
//   npm run importar:behance                         importa todo
//   npm run importar:behance -- --sin-cache          vuelve a descargar las páginas aunque estén guardadas
//   npm run importar:behance -- --sin-feed           no lee el feed RSS (solo behance-urls.txt y behance-paginas/)
//   npm run importar:behance -- --prueba pagina.html muestra qué datos saca de una página guardada (no escribe nada)
//
// Fuentes que usa (en este orden, sin repetir proyectos):
//   1) el feed RSS público del perfil
//   2) los enlaces de behance-urls.txt (uno por línea), si el archivo existe
//   3) las páginas guardadas a mano en la carpeta behance-paginas/ (Archivo → Guardar como, en el navegador)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearCliente, BloqueoError } from './behance/red.mjs';
import { leerFeed, leerProyecto, idDesdeUrl, normalizarUrlProyecto } from './behance/extraer.mjs';
import { guardarImagen } from './behance/imagenes.mjs';
import { proyectosExistentes, escribirProyecto } from './behance/archivos.mjs';
import { escribirInforme } from './behance/informe.mjs';
import { parse as parseYaml } from 'yaml';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rutas = {
  config: path.join(RAIZ, 'config', 'sitio.json'),
  proyectos: path.join(RAIZ, 'content', 'proyectos'),
  publica: path.join(RAIZ, 'public'),
  cache: path.join(RAIZ, '.cache-behance'),
  urls: path.join(RAIZ, 'behance-urls.txt'),
  paginas: path.join(RAIZ, 'behance-paginas'),
  informe: path.join(RAIZ, 'IMPORTACION.md'),
};

const args = process.argv.slice(2);
const sitio = JSON.parse(fs.readFileSync(rutas.config, 'utf8'));
const cfg = sitio.behance ?? {};

// ── Modo prueba: analiza una página guardada y muestra el resultado ──
if (args.includes('--prueba')) {
  const archivo = args[args.indexOf('--prueba') + 1];
  if (!archivo || !fs.existsSync(archivo)) salir('Indicá una página guardada: npm run importar:behance -- --prueba pagina.html');
  const html = fs.readFileSync(archivo, 'utf8');
  const url = html.match(/saved from url=\(\d+\)(\S+)/)?.[1] ?? html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
  const datos = leerProyecto(html, { url });
  console.log(JSON.stringify({ ...datos, ...mapearEtiquetas(datos.etiquetas) }, null, 2));
  process.exit(0);
}

if (!cfg.usuario) salir('Falta "behance.usuario" en config/sitio.json');

const fecha = new Date().toISOString().slice(0, 10);
const cliente = crearCliente({
  sitioUrl: sitio.url,
  usuario: cfg.usuario,
  pausaSegundos: cfg.pausaEntrePedidosSegundos ?? 2,
  carpetaCache: rutas.cache,
  usarCache: !args.includes('--sin-cache'),
});
const informe = {
  fecha,
  fuentes: [],
  resultados: [],
  sinMapear: new Map(), // etiqueta → [títulos]
  errores: [],
  bloqueo: null,
};

console.log(`\nImportando proyectos de behance.net/${cfg.usuario}`);
console.log(`Programa identificado como: ${cliente.userAgent}\n`);

// ── 1. Lista de proyectos ──────────────────────────────────────────
const lista = new Map(); // id → { url, titulo, anio, portada, html? }

if (!args.includes('--sin-feed')) {
  try {
    const xml = await cliente.leerPagina(`https://www.behance.net/feeds/user?username=${encodeURIComponent(cfg.usuario)}`);
    const items = leerFeed(xml);
    items.forEach((p) => lista.set(p.id, p));
    informe.fuentes.push(`Feed RSS: ${items.length} proyectos`);
    console.log(`• Feed RSS: ${items.length} proyectos`);
  } catch (e) {
    registrarError('Feed RSS', e);
  }
}

if (fs.existsSync(rutas.urls)) {
  const urls = fs
    .readFileSync(rutas.urls, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean);
  let nuevos = 0;
  for (const u of urls) {
    const id = idDesdeUrl(u);
    if (!id) {
      informe.errores.push(`behance-urls.txt: "${u}" no parece un enlace de proyecto (/gallery/...)`);
      continue;
    }
    if (!lista.has(id)) nuevos++;
    lista.set(id, { ...lista.get(id), id, url: normalizarUrlProyecto(u) });
  }
  informe.fuentes.push(`behance-urls.txt: ${urls.length} enlaces (${nuevos} que no estaban en el feed)`);
  console.log(`• behance-urls.txt: ${urls.length} enlaces`);
}

if (fs.existsSync(rutas.paginas)) {
  const archivos = fs.readdirSync(rutas.paginas).filter((f) => /\.html?$/i.test(f));
  for (const f of archivos) {
    const html = fs.readFileSync(path.join(rutas.paginas, f), 'utf8');
    const url = html.match(/saved from url=\(\d+\)(\S+)/)?.[1] ?? html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
    const datos = leerProyecto(html, { url });
    if (!datos.id) {
      informe.errores.push(`behance-paginas/${f}: no se encontró el número del proyecto`);
      continue;
    }
    lista.set(datos.id, { ...lista.get(datos.id), id: datos.id, url: datos.url, html });
  }
  informe.fuentes.push(`behance-paginas/: ${archivos.length} páginas guardadas`);
  console.log(`• behance-paginas/: ${archivos.length} páginas guardadas`);
}

if (!lista.size) {
  escribirInforme(rutas.informe, informe);
  salir('\nNo se encontró ningún proyecto para importar. Revisá IMPORTACION.md.');
}

// ── 2. Cada proyecto ───────────────────────────────────────────────
const { porId, slugs } = proyectosExistentes(rutas.proyectos);
console.log(`\nProcesando ${lista.size} proyectos…\n`);

for (const item of lista.values()) {
  const nombre = item.titulo || item.url;
  try {
    // Si Behance no deja leer la página del proyecto, se usa solo lo que trae el feed
    let datos;
    let soloFeed = false;
    if (item.html) {
      datos = leerProyecto(item.html, { url: item.url, id: item.id });
    } else if (cliente.bloqueado(new URL(item.url).host)) {
      if (!item.titulo) throw new Error('Behance bloqueó la página y este enlace no está en el feed');
      datos = datosDelFeed(item);
      soloFeed = true;
    } else {
      try {
        datos = leerProyecto(await cliente.leerPagina(item.url), { url: item.url, id: item.id });
      } catch (e) {
        if (!(e instanceof BloqueoError) || !item.titulo) throw e;
        registrarError(nombre, e);
        datos = datosDelFeed(item);
        soloFeed = true;
      }
    }
    const titulo = datos.titulo || item.titulo || `Proyecto ${item.id}`;

    // Mismo proyecto ya importado → misma carpeta (aunque le hayas cambiado el slug)
    const existente = porId.get(item.id);
    const slug = existente?.carpeta ?? slugUnico(titulo, slugs);
    slugs.add(slug);

    // Imágenes: se descargan y se convierten a WebP
    const tamanos = cfg.tamanosImagen ?? [480, 960, 1600];
    const urlPortada = datos.portada ?? item.portada ?? datos.imagenes[0];
    const faltantes = [];
    let miniatura = '';
    // Para la portada se prueba primero la versión más grande disponible en el CDN de Behance
    for (const u of urlPortada ? versionesPortada(urlPortada) : []) {
      const intento = [];
      miniatura = await bajar(u, slug, 'portada', tamanos, intento);
      if (miniatura) break;
      if (u === urlPortada) faltantes.push(...intento);
    }
    const stills = [];
    for (const [i, u] of datos.imagenes.entries()) {
      if (cliente.bloqueado(new URL(u).host)) break;
      const ruta = await bajar(u, slug, `still-${String(i + 1).padStart(2, '0')}`, tamanos, faltantes);
      if (ruta) stills.push({ src: ruta, alt: '' });
    }
    if (!miniatura && stills.length) miniatura = stills[0].src;

    const { categorias, sinMapear } = mapearEtiquetas(datos.etiquetas);
    sinMapear.forEach((e) => informe.sinMapear.set(e, [...(informe.sinMapear.get(e) ?? []), titulo]));

    // La sinopsis es el primer párrafo; el resto del texto va al cuerpo de la página
    const parrafos = [datos.descripcion, ...datos.textos].join('\n\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const unicos = [...new Set(parrafos)];
    const nuevo = {
      titulo,
      anio: datos.anio ?? item.anio ?? null,
      categorias,
      sinopsis: unicos[0] ?? '',
      video: datos.videos[0] ?? '',
      miniatura,
      stills,
      cuerpo: unicos.slice(1).join('\n\n'),
    };
    // Con solo el feed no se conoce la galería, el video ni las etiquetas: esos campos no se tocan
    if (soloFeed) for (const campo of ['categorias', 'video', 'stills', 'cuerpo']) delete nuevo[campo];
    if (soloFeed && !nuevo.sinopsis) delete nuevo.sinopsis;

    const { accion, conflictos } = escribirProyecto({
      carpetaProyecto: path.join(rutas.proyectos, slug),
      slug,
      nuevo,
      behance: { id: item.id, url: datos.url || item.url },
      fecha,
    });

    // Lo que hay que revisar a mano
    const leido = leerFrontmatter(path.join(rutas.proyectos, slug, 'index.md'));
    const pendientes = [];
    for (const [campo, etiqueta] of [['rol', 'rol'], ['cliente', 'cliente'], ['duracion', 'duración']]) if (!leido?.[campo]) pendientes.push(etiqueta);
    if (!leido?.ficha?.camara) pendientes.push('cámara');
    if (!leido?.ficha?.equipo) pendientes.push('equipo');
    if (!leido?.sinopsis) pendientes.push('sinopsis');
    if (!leido?.categorias?.length) pendientes.push('categoría');
    if (!leido?.video) pendientes.push('video');
    if (!nuevo.anio) pendientes.push('año');
    if (!miniatura && !leido?.miniatura) pendientes.push('miniatura');
    if (soloFeed && !leido?.stills?.length) pendientes.push('galería de stills');

    informe.resultados.push({
      titulo,
      slug,
      accion,
      url: item.url,
      fuente: item.html ? 'página guardada' : datos.fuenteDatos,
      soloFeed,
      imagenes: stills.length + (miniatura ? 1 : 0),
      videosExtra: datos.videos.slice(1),
      videosBehance: datos.videosBehance,
      etiquetas: datos.etiquetas,
      sinMapear,
      conflictos,
      faltantes,
      pendientes,
      borrador: leido?.publicado === false,
    });
    console.log(`  ${accion === 'creado' ? '+' : accion === 'actualizado' ? '~' : '='} ${titulo}  (${accion}${pendientes.length ? `, falta: ${pendientes.join(', ')}` : ''})`);
  } catch (e) {
    registrarError(nombre, e);
  }
}

// ── 3. Informe ─────────────────────────────────────────────────────
escribirInforme(rutas.informe, informe);
const c = (a) => informe.resultados.filter((r) => r.accion === a).length;
console.log(`\nListo: ${c('creado')} nuevos, ${c('actualizado')} actualizados, ${c('sin cambios')} sin cambios, ${informe.errores.length} con problemas.`);
if (informe.bloqueo) console.log(`\n⚠  ${informe.bloqueo}`);
console.log(`Detalle y lista de lo que tenés que revisar: IMPORTACION.md\n`);

// ── Ayudantes ──────────────────────────────────────────────────────
async function bajar(url, slug, nombre, tamanos, faltantes) {
  try {
    const buffer = await cliente.descargar(url);
    return await guardarImagen(buffer, { carpetaPublica: rutas.publica, slug, nombre, tamanos });
  } catch (e) {
    if (e instanceof BloqueoError && !informe.bloqueo) registrarError('Imágenes', e);
    faltantes.push(`${nombre}: ${e.message}`);
    return '';
  }
}

/** Datos mínimos de un proyecto a partir del feed RSS (cuando la página está bloqueada). */
function datosDelFeed(item) {
  return {
    id: item.id,
    url: item.url,
    titulo: item.titulo,
    descripcion: item.descripcion ?? '',
    textos: [],
    anio: item.anio,
    etiquetas: [],
    portada: item.portada,
    imagenes: [],
    videos: [],
    videosBehance: 0,
    fuenteDatos: 'feed RSS (página bloqueada)',
  };
}

/** Variantes de una portada de Behance, de la más grande a la original del feed. */
function versionesPortada(url) {
  const m = url.match(/^(.*\/projects\/)([^/]+)(\/.+)$/);
  if (!m) return [url];
  return [...new Set(['original', 'max_808', m[2]].map((t) => m[1] + t + m[3]))];
}

function mapearEtiquetas(etiquetas) {
  const sinTilde = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const mapa = new Map(Object.entries(cfg.mapeoEtiquetas ?? {}).map(([k, v]) => [sinTilde(k), v]));
  // Una etiqueta que ya es el nombre de una categoría también vale ("Documental")
  (sitio.categorias ?? []).forEach((c) => mapa.set(sinTilde(c), c));
  const categorias = [];
  const sinMapear = [];
  for (const e of etiquetas) {
    const cat = mapa.get(sinTilde(e));
    if (cat) !categorias.includes(cat) && categorias.push(cat);
    else sinMapear.push(e);
  }
  return { categorias, sinMapear };
}

function slugUnico(titulo, usados) {
  const base =
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'proyecto';
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

function leerFrontmatter(archivo) {
  try {
    const m = fs.readFileSync(archivo, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return m ? (parseYaml(m[1]) ?? {}) : {};
  } catch {
    return {};
  }
}

function registrarError(donde, e) {
  if (e instanceof BloqueoError) {
    informe.bloqueo =
      `${e.message} al leer ${e.url}. El importador no insistió con esas páginas: los proyectos se crearon ` +
      'con lo que trae el feed (título, año, portada y descripción si la hay). Para sumar la galería y el video, ' +
      'pegá el enlace de Vimeo/YouTube en cada archivo, o guardá la página del proyecto desde tu navegador ' +
      '(Archivo → Guardar como, solo HTML) en la carpeta behance-paginas/ y corré: npm run importar:behance -- --sin-feed';
    console.log(`  ! ${donde}: ${e.message}. Se sigue solo con los datos del feed.`);
  } else {
    informe.errores.push(`${donde}: ${e.message}`);
    console.log(`  ✕ ${donde}: ${e.message}`);
  }
}

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}
