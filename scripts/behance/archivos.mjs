// Crea o actualiza los archivos de proyecto sin pisar lo que se editó a mano.
//
// Cómo funciona: junto a cada index.md importado se guarda .importado-behance.json
// con los valores que trajo la última importación. Al volver a importar, un campo
// solo se actualiza si en el archivo sigue igual a lo que se importó la vez anterior.
// Si lo cambiaste vos, se respeta tu versión.
import fs from 'node:fs';
import path from 'node:path';
import { parseDocument, parse as parseYaml } from 'yaml';

/** Campos que el importador administra. El resto (rol, cliente, ficha, publicado...) nunca se tocan después de crear el archivo. */
export const CAMPOS_IMPORTADOS = ['titulo', 'anio', 'categorias', 'sinopsis', 'video', 'miniatura', 'stills', 'cuerpo'];
const ESTADO = '.importado-behance.json';

/** Lee todos los proyectos existentes para encontrar los ya importados (por número de Behance). */
export function proyectosExistentes(carpetaProyectos) {
  const porId = new Map();
  const slugs = new Set();
  if (!fs.existsSync(carpetaProyectos)) return { porId, slugs };
  for (const carpeta of fs.readdirSync(carpetaProyectos)) {
    const archivo = path.join(carpetaProyectos, carpeta, 'index.md');
    if (!fs.existsSync(archivo)) continue;
    slugs.add(carpeta);
    const { datos } = separar(fs.readFileSync(archivo, 'utf8'));
    if (datos?.slug) slugs.add(datos.slug);
    const id = datos?.behance?.id;
    if (id) porId.set(String(id), { carpeta, archivo });
  }
  return { porId, slugs };
}

function separar(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { yaml: '', cuerpo: texto, datos: null };
  let datos = null;
  try {
    datos = parseYaml(m[1]);
  } catch {
    /* frontmatter con errores: se informa más adelante */
  }
  return { yaml: m[1], cuerpo: m[2], datos };
}

const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Escribe el proyecto. Devuelve { accion: 'creado' | 'actualizado' | 'sin cambios', conflictos: [campo] }.
 */
export function escribirProyecto({ carpetaProyecto, slug, nuevo, behance, fecha }) {
  const archivo = path.join(carpetaProyecto, 'index.md');
  const archivoEstado = path.join(carpetaProyecto, ESTADO);
  fs.mkdirSync(carpetaProyecto, { recursive: true });

  if (!fs.existsSync(archivo)) {
    fs.writeFileSync(archivo, plantillaNueva({ slug, nuevo, behance, fecha }));
    fs.writeFileSync(archivoEstado, JSON.stringify({ fecha, valores: nuevo }, null, 2) + '\n');
    return { accion: 'creado', conflictos: [] };
  }

  const texto = fs.readFileSync(archivo, 'utf8');
  const { yaml, cuerpo } = separar(texto);
  const doc = parseDocument(yaml);
  if (doc.errors.length) throw new Error(`el archivo ${archivo} tiene un error de formato: ${doc.errors[0].message}`);
  const anterior = fs.existsSync(archivoEstado) ? JSON.parse(fs.readFileSync(archivoEstado, 'utf8')).valores : {};

  const conflictos = [];
  let cambios = false;
  let cuerpoFinal = cuerpo;
  const guardado = { ...anterior };

  for (const campo of CAMPOS_IMPORTADOS) {
    const actual = campo === 'cuerpo' ? cuerpo.trim() : doc.toJS()?.[campo];
    const valorNuevo = nuevo[campo];
    if (igual(valorNuevo, anterior[campo])) continue; // Behance no cambió este dato

    const sinTocar = !(campo in anterior) ? actual === undefined || actual === '' : igual(actual, anterior[campo]);
    if (!sinTocar) {
      // Lo editaste a mano: se mantiene tu versión
      conflictos.push(campo);
      continue;
    }
    if (campo === 'cuerpo') cuerpoFinal = valorNuevo ? `\n${valorNuevo}\n` : '';
    else doc.set(campo, valorNuevo);
    guardado[campo] = valorNuevo;
    cambios = true;
  }

  // Siempre se mantienen los datos de Behance al día
  if (!igual(doc.toJS()?.behance, behance)) {
    doc.set('behance', behance);
    cambios = true;
  }

  if (cambios) {
    fs.writeFileSync(archivo, `---\n${doc.toString().trimEnd()}\n---\n${cuerpoFinal}`);
    fs.writeFileSync(archivoEstado, JSON.stringify({ fecha, valores: guardado }, null, 2) + '\n');
  }
  return { accion: cambios ? 'actualizado' : 'sin cambios', conflictos };
}

const y = (v) => JSON.stringify(v ?? ''); // texto entre comillas, válido en YAML

function plantillaNueva({ slug, nuevo, behance, fecha }) {
  const stills = nuevo.stills.length
    ? nuevo.stills.map((s) => `  - src: ${y(s.src)}\n    alt: ""             # COMPLETAR: describí la imagen`).join('\n')
    : '  []';
  return `---
# Importado de Behance el ${fecha}. Revisá los campos marcados con COMPLETAR.
# Si volvés a importar, lo que cambies a mano en este archivo se respeta.

titulo: ${y(nuevo.titulo)}
slug: ${y(slug)}
anio: ${nuevo.anio ?? new Date().getFullYear()}${nuevo.anio ? '' : '             # COMPLETAR: Behance no tenía el año'}
categorias: ${JSON.stringify(nuevo.categorias)}${nuevo.categorias.length ? '' : '    # COMPLETAR: Sin categoría (ver IMPORTACION.md)'}
rol: ""                 # COMPLETAR (ej. Director · Editor)
cliente: ""             # COMPLETAR
duracion: ""            # COMPLETAR (ej. 3:42 o 14 min)
destacado: false
publicado: false        # Borrador: cambiá a true cuando lo revises

sinopsis: ${y(nuevo.sinopsis)}${nuevo.sinopsis ? '' : '   # COMPLETAR'}

video: ${y(nuevo.video)}${nuevo.video ? '' : '              # COMPLETAR si hay video en Vimeo o YouTube'}

miniatura: ${y(nuevo.miniatura)}
stills:
${stills}

ficha:
  camara: ""            # COMPLETAR
  equipo: ""            # COMPLETAR

# Datos de Behance: no los borres, sirven para no duplicar el proyecto al reimportar
behance:
  id: ${y(behance.id)}
  url: ${y(behance.url)}
---
${nuevo.cuerpo ? `\n${nuevo.cuerpo}\n` : ''}`;
}
