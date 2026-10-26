// Lee el feed RSS y las páginas públicas de proyecto de Behance y saca los datos útiles.
// Behance cambia su HTML cada tanto, así que se prueban varias fuentes en orden:
//   1) los datos del proyecto incrustados en la página (JSON)
//   2) las etiquetas Open Graph y el HTML visible
import * as cheerio from 'cheerio';

/** Número de proyecto a partir de su dirección: /gallery/255877249/HIJOS-DE-LA-DESDICHA → "255877249" */
export function idDesdeUrl(url) {
  return String(url).match(/\/gallery\/(\d+)/)?.[1] ?? null;
}

export function normalizarUrlProyecto(url) {
  const id = idDesdeUrl(url);
  if (!id) return null;
  const u = new URL(url, 'https://www.behance.net');
  const nombre = u.pathname.split('/')[3] ?? '';
  return `https://www.behance.net/gallery/${id}/${nombre}`.replace(/\/$/, '');
}

// ── Feed RSS ──────────────────────────────────────────────────────
export function leerFeed(xml) {
  const $ = cheerio.load(xml, { xml: true });
  return $('item')
    .toArray()
    .map((item) => {
      const $i = $(item);
      const link = $i.find('link').text().trim() || $i.find('guid').text().trim();
      const descripcionHtml = $i.find('description').text();
      const portada = cheerio.load(descripcionHtml)('img').first().attr('src') ?? null;
      const fecha = new Date($i.find('pubDate').text().trim());
      return {
        id: idDesdeUrl(link),
        url: normalizarUrlProyecto(link),
        titulo: $i.find('title').text().trim(),
        anio: Number.isNaN(fecha.getTime()) ? null : fecha.getFullYear(),
        portada,
      };
    })
    .filter((p) => p.id);
}

// ── Página de proyecto ────────────────────────────────────────────
export function leerProyecto(html, { url = '', id = idDesdeUrl(url) } = {}) {
  const $ = cheerio.load(html);
  const datos = buscarDatosIncrustados($, id);
  const og = (p) => $(`meta[property="${p}"]`).attr('content') || $(`meta[name="${p}"]`).attr('content') || '';

  const titulo = limpiarTexto(datos?.name || datos?.title || og('og:title').replace(/\s+on Behance\s*$/i, '') || $('h1').first().text());
  const descripcion = limpiarTexto(datos?.description || og('og:description') || '');

  // Año: fecha de publicación del proyecto
  const segundos = datos?.publishedOn ?? datos?.published_on ?? datos?.createdOn ?? datos?.created_on;
  const anio = segundos ? new Date(Number(segundos) * (Number(segundos) < 1e12 ? 1000 : 1)).getFullYear() : null;

  // Etiquetas y áreas creativas
  const etiquetas = unicos([
    ...listaDeNombres(datos?.tags),
    ...listaDeNombres(datos?.fields),
    ...listaDeNombres(datos?.creativeFields),
    ...(datos ? [] : ($('meta[name="keywords"]').attr('content') ?? '').split(',')),
  ]);

  // Imágenes: se buscan en los módulos del proyecto o, si no hay datos, en el HTML
  const fuenteImagenes = datos?.modules ?? datos?.allModules ?? null;
  let imagenes = fuenteImagenes ? imagenesEn(fuenteImagenes) : [];
  if (!imagenes.length) {
    imagenes = imagenesEn(
      $('img')
        .toArray()
        .flatMap((img) => [$(img).attr('src'), ...($(img).attr('srcset') ?? '').split(',').map((s) => s.trim().split(' ')[0])])
        .filter(Boolean),
    );
  }

  // Portada: la de los datos, la de Open Graph o la primera imagen
  const portadas = datos?.covers ? imagenesEn(datos.covers, { soloProyecto: false }) : [];
  const portada = portadas[0] ?? (og('og:image') || null) ?? imagenes[0] ?? null;

  // Videos de Vimeo / YouTube embebidos
  const textoCompleto = (fuenteImagenes ? JSON.stringify(fuenteImagenes) : '') + ' ' + $('iframe').toArray().map((f) => $(f).attr('src')).join(' ');
  const videos = videosEn(textoCompleto);

  // Videos subidos directamente a Behance (no se pueden embeber en el sitio)
  const videosBehance = fuenteImagenes
    ? recorrer(fuenteImagenes).filter((o) => /video/i.test(o.__typename ?? o.type ?? '') && !videosEn(JSON.stringify(o)).length).length
    : $('video').length;

  // Textos largos del proyecto (módulos de texto)
  const textos = fuenteImagenes
    ? recorrer(fuenteImagenes)
        .filter((o) => /text/i.test(o.__typename ?? o.type ?? '') && (o.text || o.textPlain))
        .map((o) => limpiarTexto(o.textPlain || o.text))
        .filter(Boolean)
    : [];

  return {
    id: id ?? (datos?.id ? String(datos.id) : null),
    url: normalizarUrlProyecto(url) ?? url,
    titulo,
    descripcion,
    textos: unicos(textos),
    anio,
    etiquetas,
    portada,
    imagenes: imagenes.filter((i) => i !== portada),
    videos,
    videosBehance,
    fuenteDatos: datos ? 'datos incrustados' : 'HTML / Open Graph',
  };
}

/** Busca el objeto del proyecto dentro de los <script> con JSON de la página. */
function buscarDatosIncrustados($, id) {
  const candidatos = [];
  $('script').each((_, s) => {
    const tipo = $(s).attr('type') ?? '';
    if (tipo && !/json/i.test(tipo)) return;
    const texto = $(s).text().trim();
    if (!texto.startsWith('{') && !texto.startsWith('[')) return;
    try {
      const json = JSON.parse(texto);
      for (const o of recorrer(json)) {
        if (Array.isArray(o.modules) && (o.name || o.title)) candidatos.push(o);
      }
    } catch {
      /* no era JSON */
    }
  });
  if (!candidatos.length) return null;
  return (
    candidatos.find((c) => id && String(c.id) === String(id)) ??
    candidatos.sort((a, b) => b.modules.length - a.modules.length)[0]
  );
}

/** Recorre un objeto JSON y devuelve todos los objetos que contiene. */
function recorrer(valor, salida = [], vistos = new Set()) {
  if (valor && typeof valor === 'object' && !vistos.has(valor)) {
    vistos.add(valor);
    if (!Array.isArray(valor)) salida.push(valor);
    for (const v of Object.values(valor)) recorrer(v, salida, vistos);
  }
  return salida;
}

// Las imágenes de Behance viven en .../project_modules/<tamaño>/<archivo>.
// Se agrupan por archivo y se elige el tamaño más grande disponible.
const RANGO_TAMANO = (t) => {
  if (t === 'source') return 0; // el original puede ser enorme o no ser una imagen web
  if (t === 'fs') return 1920;
  if (t === 'original') return 3000; // portadas
  const n = t.match(/(\d{3,4})/);
  return n ? Number(n[1]) : 100;
};

function imagenesEn(fuente, { soloProyecto = true } = {}) {
  const urls = (typeof fuente === 'string' ? [fuente] : JSON.stringify(fuente).match(/https?:\\?\/\\?\/[^"'\s)]+/g) ?? [])
    .concat(Array.isArray(fuente) && fuente.every((x) => typeof x === 'string') ? fuente : [])
    .map((u) => u.replace(/\\\//g, '/'));
  const porArchivo = new Map();
  for (const url of urls) {
    if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) continue;
    const m = url.match(/\/(project_modules|projects)\/([^/]+)\/([^/?]+)/);
    if (!m) {
      if (!soloProyecto) porArchivo.set(url, { url, rango: 1 });
      continue;
    }
    if (soloProyecto && m[1] !== 'project_modules') continue;
    const [, , tamano, archivo] = m;
    const rango = RANGO_TAMANO(tamano);
    const actual = porArchivo.get(archivo);
    if (!actual || rango > actual.rango) porArchivo.set(archivo, { url, rango });
  }
  const lista = [...porArchivo.values()];
  if (!soloProyecto) lista.sort((a, b) => b.rango - a.rango);
  return lista.map((x) => x.url);
}

/** Devuelve los enlaces de Vimeo y YouTube que aparecen en un texto. */
export function videosEn(texto) {
  const limpio = String(texto).replace(/\\\//g, '/').replace(/&amp;/g, '&');
  const encontrados = [];
  for (const m of limpio.matchAll(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})(?:\/([a-f0-9]{6,}))?(?:\?[^"'\s<>]*?h=([a-f0-9]+))?/gi)) {
    const hash = m[2] || m[3];
    encontrados.push(`https://vimeo.com/${m[1]}${hash ? '/' + hash : ''}`);
  }
  for (const m of limpio.matchAll(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/gi)) {
    encontrados.push(`https://www.youtube.com/watch?v=${m[1]}`);
  }
  return unicos(encontrados);
}

function listaDeNombres(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((x) => (typeof x === 'string' ? x : x?.title ?? x?.name ?? x?.label ?? '')).filter(Boolean);
}

function limpiarTexto(t) {
  return cheerio
    .load(`<div>${String(t ?? '').replace(/<br\s*\/?>/gi, '\n')}</div>`)('div')
    .text()
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function unicos(lista) {
  const vistos = new Set();
  return lista
    .map((x) => String(x).trim())
    .filter((x) => x && !vistos.has(x.toLowerCase()) && vistos.add(x.toLowerCase()));
}
