// Acceso a la red: se identifica con un nombre propio, respeta robots.txt,
// espera entre pedidos y se detiene ante cualquier bloqueo (no intenta evadirlo).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class BloqueoError extends Error {
  constructor(mensaje, url) {
    super(mensaje);
    this.url = url;
  }
}

const NOMBRE_PROGRAMA = 'PortfolioImporter';

export function crearCliente({ sitioUrl, usuario, pausaSegundos = 2, carpetaCache, usarCache = true }) {
  const userAgent = `${NOMBRE_PROGRAMA}/1.0 (importador personal de ${usuario}; +${sitioUrl})`;
  const reglasPorHost = new Map();
  let ultimoPedido = 0;
  const bloqueos = new Map(); // host → error (no se vuelve a pedir nada a ese host)

  fs.mkdirSync(carpetaCache, { recursive: true });

  async function esperarTurno(segundos) {
    const espera = ultimoPedido + segundos * 1000 - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultimoPedido = Date.now();
  }

  async function pedir(url, { tipo = 'texto', pausa = pausaSegundos } = {}) {
    const host = new URL(url).host;
    if (bloqueos.has(host)) throw bloqueos.get(host);
    await esperarTurno(pausa);
    let respuesta;
    try {
      respuesta = await fetch(url, {
        headers: { 'User-Agent': userAgent, Accept: tipo === 'binario' ? 'image/*' : 'text/html,application/xml,*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      });
    } catch (e) {
      throw new Error(`No se pudo conectar con ${new URL(url).host}: ${e.message}`);
    }
    // 401/403/429 o una página de verificación = Behance no quiere lectura automática. Se respeta.
    if ([401, 403, 429].includes(respuesta.status)) {
      bloqueos.set(host, new BloqueoError(`${host} respondió ${respuesta.status} (acceso bloqueado o demasiados pedidos)`, url));
      throw bloqueos.get(host);
    }
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status} al leer ${url}`);
    if (tipo === 'binario') return Buffer.from(await respuesta.arrayBuffer());
    const texto = await respuesta.text();
    if (pareceVerificacion(texto)) {
      bloqueos.set(host, new BloqueoError(`${host} mostró una verificación anti-robots (captcha)`, url));
      throw bloqueos.get(host);
    }
    return texto;
  }

  /** Revisa robots.txt del sitio antes de leer una dirección. */
  async function permitido(url) {
    const u = new URL(url);
    if (!reglasPorHost.has(u.host)) {
      let reglas = [];
      try {
        const txt = await pedir(`${u.protocol}//${u.host}/robots.txt`, { pausa: 0 });
        reglas = reglasRobots(txt, NOMBRE_PROGRAMA);
      } catch (e) {
        if (e instanceof BloqueoError) throw e;
        // Sin robots.txt se asume permitido
      }
      reglasPorHost.set(u.host, reglas);
    }
    return rutaPermitida(reglasPorHost.get(u.host), u.pathname + u.search);
  }

  /** Lee una página de Behance (usando la copia local si es reciente). */
  async function leerPagina(url) {
    const archivo = path.join(carpetaCache, crypto.createHash('sha1').update(url).digest('hex') + '.html');
    const unDia = 24 * 60 * 60 * 1000;
    if (usarCache && fs.existsSync(archivo) && Date.now() - fs.statSync(archivo).mtimeMs < unDia) {
      return fs.readFileSync(archivo, 'utf8');
    }
    if (!(await permitido(url))) throw new Error(`robots.txt de Behance no permite leer ${url}`);
    const html = await pedir(url);
    fs.writeFileSync(archivo, html);
    return html;
  }

  /** Descarga una imagen del CDN de Behance (pausa corta: son archivos estáticos). */
  async function descargar(url) {
    return pedir(url, { tipo: 'binario', pausa: 0.5 });
  }

  return { leerPagina, descargar, userAgent, bloqueado: (host) => bloqueos.has(host) };
}

function pareceVerificacion(html) {
  const muestra = html.slice(0, 20_000).toLowerCase();
  return /captcha|challenge-platform|cf-chl-|are you a robot|access denied/.test(muestra) && !/beconfig|og:title/.test(muestra);
}

// ── robots.txt ────────────────────────────────────────────────────
// Toma las reglas del grupo que nombra a este programa o, si no hay, las de "User-agent: *".
export function reglasRobots(texto, agente) {
  const grupos = [];
  let actual = null;
  let leyendoAgentes = false;
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.replace(/#.*/, '').trim();
    const m = limpia.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, campo, valor] = m;
    if (campo.toLowerCase() === 'user-agent') {
      if (!leyendoAgentes) grupos.push((actual = { agentes: [], reglas: [] }));
      actual.agentes.push(valor.toLowerCase());
      leyendoAgentes = true;
    } else if (actual && /^(allow|disallow)$/i.test(campo)) {
      leyendoAgentes = false;
      if (valor) actual.reglas.push({ permitir: campo.toLowerCase() === 'allow', ruta: valor });
    } else {
      leyendoAgentes = false;
    }
  }
  const propio = grupos.find((g) => g.agentes.some((a) => a !== '*' && agente.toLowerCase().includes(a)));
  return (propio ?? grupos.find((g) => g.agentes.includes('*')))?.reglas ?? [];
}

export function rutaPermitida(reglas, ruta) {
  let mejor = null;
  for (const regla of reglas) {
    const patron = new RegExp(
      '^' + regla.ruta.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$|\$$/, '$'),
    );
    if (patron.test(ruta) && (!mejor || regla.ruta.length > mejor.ruta.length)) mejor = regla;
  }
  return !mejor || mejor.permitir;
}
