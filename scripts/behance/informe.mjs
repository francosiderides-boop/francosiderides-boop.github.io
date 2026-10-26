// Escribe IMPORTACION.md: qué se importó y qué hay que revisar a mano.
import fs from 'node:fs';

const NOMBRES_CAMPO = {
  titulo: 'título',
  anio: 'año',
  categorias: 'categorías',
  sinopsis: 'sinopsis',
  video: 'video',
  miniatura: 'miniatura',
  stills: 'galería de stills',
  cuerpo: 'texto largo',
};

export function escribirInforme(archivo, inf) {
  const r = inf.resultados;
  const cuenta = (a) => r.filter((x) => x.accion === a).length;
  const incompletos = r.filter((x) => x.pendientes.length);
  const lineas = [];
  const l = (t = '') => lineas.push(t);

  l('# Informe de importación desde Behance');
  l();
  l(`Última importación: **${inf.fecha}**. Este archivo se vuelve a escribir cada vez que corrés \`npm run importar:behance\`.`);
  l();
  l('## Resumen');
  l();
  l(`- Proyectos procesados: **${r.length}**`);
  l(`- Nuevos: **${cuenta('creado')}** · Actualizados: **${cuenta('actualizado')}** · Sin cambios: **${cuenta('sin cambios')}**`);
  l(`- Con datos incompletos: **${incompletos.length}**`);
  l(`- Con problemas: **${inf.errores.length}**`);
  if (inf.fuentes.length) l(`- De dónde salieron: ${inf.fuentes.join(' · ')}`);
  l();
  l('> Los proyectos importados entran como **borrador** (`publicado: false`): se ven cuando corrés el sitio en tu');
  l('> computadora (`npm run dev`), pero no se publican hasta que cambies esa línea a `publicado: true`.');
  l();

  if (inf.bloqueo) {
    l('## ⚠ Behance bloqueó la lectura');
    l();
    l(inf.bloqueo);
    l();
  }

  l('## Qué tenés que revisar a mano');
  l();
  if (!r.length) l('No se importó ningún proyecto.');
  for (const x of r) {
    const tareas = [];
    if (x.pendientes.length) tareas.push(`Completar: ${x.pendientes.join(', ')}.`);
    if (x.conflictos.length)
      tareas.push(
        `Behance tiene cambios en ${x.conflictos.map((c) => NOMBRES_CAMPO[c] ?? c).join(', ')}, pero los editaste a mano: se mantuvo tu versión. Compará con [Behance](${x.url}) por si querés actualizarlo.`,
      );
    if (x.sinMapear.length) tareas.push(`Etiquetas sin categoría: ${x.sinMapear.map((e) => `"${e}"`).join(', ')}.`);
    if (x.videosExtra.length) tareas.push(`Tiene más de un video; se usó el primero. Otros: ${x.videosExtra.join(' , ')}`);
    if (x.videosBehance) tareas.push(`Tiene ${x.videosBehance} video(s) subidos directamente a Behance: esos no se pueden embeber. Subilos a Vimeo o YouTube y pegá el enlace en \`video\`.`);
    if (x.faltantes.length) tareas.push(`No se pudieron descargar algunas imágenes: ${x.faltantes.join('; ')}.`);
    if (x.imagenes === 0) tareas.push('No se encontró ninguna imagen.');
    if (x.borrador) tareas.push('Cuando esté listo, cambiá `publicado: false` por `publicado: true`.');

    l(`### ${x.titulo} — ${x.accion}`);
    l();
    l(`Archivo: \`content/proyectos/${x.slug}/index.md\` · Imágenes: ${x.imagenes} en \`public/proyectos/${x.slug}/\` · [Ver en Behance](${x.url})`);
    l();
    tareas.forEach((t) => l(`- [ ] ${t}`));
    if (!tareas.length) l('- Nada pendiente.');
    l();
  }

  l('## Etiquetas de Behance que no encajan en tus categorías');
  l();
  if (!inf.sinMapear.size) {
    l('Todas las etiquetas encajaron en una categoría.');
  } else {
    l('Decidí qué hacer con cada una. Para asignarlas automáticamente la próxima vez, agregalas en');
    l('`config/sitio.json` → `behance` → `mapeoEtiquetas`, por ejemplo: `"cinematography": "Comerciales"`.');
    l();
    l('| Etiqueta | Aparece en |');
    l('| --- | --- |');
    for (const [etiqueta, titulos] of [...inf.sinMapear].sort((a, b) => b[1].length - a[1].length)) {
      l(`| ${etiqueta.replace(/\|/g, '/')} | ${[...new Set(titulos)].join(', ')} |`);
    }
  }
  l();

  if (inf.errores.length) {
    l('## Problemas');
    l();
    inf.errores.forEach((e) => l(`- ${e}`));
    l();
  }

  fs.writeFileSync(archivo, lineas.join('\n'));
}
