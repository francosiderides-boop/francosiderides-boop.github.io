#!/usr/bin/env node
// Arma el sitio y lo publica: en GitHub Pages (rama gh-pages, que también sirve los videos)
// y en Netlify (guardando los cambios en GitHub con la marca [publicar]).
//   npm run publicar
// Guarda una copia de esa rama en .publicar/ para subir solo lo que cambió (los videos no se vuelven a subir).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(RAIZ, 'dist');
const COPIA = path.join(RAIZ, '.publicar');
const correr = (cmd, args, cwd = RAIZ) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const leer = (cmd, args, cwd = RAIZ) => execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim();
const git = (args) => correr('git', ['-c', 'user.name=Publicador del portfolio', '-c', 'user.email=publicar@localhost', ...args], COPIA);

let remoto;
try {
  remoto = leer('git', ['remote', 'get-url', 'origin']);
} catch {
  console.error('Este proyecto no está conectado a GitHub (falta el remoto "origin").');
  process.exit(1);
}

console.log('\n1/2 Armando el sitio…\n');
correr('npx', ['astro', 'build']);
// Sin este archivo, GitHub ignora la carpeta _astro (estilos e imágenes)
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

console.log('\n2/2 Subiendo a GitHub Pages…\n');
// Copia local de la rama gh-pages (se crea la primera vez)
if (!fs.existsSync(path.join(COPIA, '.git'))) {
  fs.rmSync(COPIA, { recursive: true, force: true });
  const existe = leer('git', ['ls-remote', '--heads', remoto, 'gh-pages']) !== '';
  if (existe) correr('git', ['clone', '-q', '--depth', '1', '--branch', 'gh-pages', remoto, COPIA]);
  else {
    fs.mkdirSync(COPIA);
    git(['init', '-q', '-b', 'gh-pages']);
    git(['remote', 'add', 'origin', remoto]);
  }
} else {
  git(['fetch', '-q', '--depth', '1', 'origin', 'gh-pages']);
  git(['reset', '-q', '--hard', 'origin/gh-pages']);
}

// Reemplaza el contenido de la rama (sin tocar .git)
for (const f of fs.readdirSync(COPIA)) if (f !== '.git') fs.rmSync(path.join(COPIA, f), { recursive: true, force: true });

const sitio = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config', 'sitio.json'), 'utf8'));
const destino = new URL(sitio.url);
if (destino.host.endsWith('.github.io')) {
  // El sitio principal es GitHub Pages: se publica completo
  fs.cpSync(DIST, COPIA, { recursive: true });
} else {
  // El sitio principal está en otro lado (Netlify): GitHub Pages solo guarda los videos,
  // la verificación de la app (.well-known) y páginas que redirigen a la dirección nueva
  const conservar = (rel) => rel.startsWith('.well-known') || /\.(mp4|webm|mov)$/i.test(rel) || rel === '.nojekyll';
  const recorrer = (dir) =>
    fs.readdirSync(path.join(DIST, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = path.posix.join(dir, e.name);
      return e.isDirectory() ? recorrer(rel) : [rel];
    });
  for (const rel of recorrer('')) {
    if (conservar(rel)) {
      fs.mkdirSync(path.dirname(path.join(COPIA, rel)), { recursive: true });
      fs.copyFileSync(path.join(DIST, rel), path.join(COPIA, rel));
    } else if (rel.endsWith('.html')) {
      const ruta = rel === '404.html' ? null : '/' + rel.replace(/index\.html$/, '');
      fs.mkdirSync(path.dirname(path.join(COPIA, rel)), { recursive: true });
      fs.writeFileSync(path.join(COPIA, rel), paginaRedireccion(destino, ruta));
    }
  }
  fs.writeFileSync(path.join(COPIA, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', destino)}\n`);
}

/** Página mínima que manda a la misma sección en la dirección nueva (ruta null = la que pidió el visitante). */
function paginaRedireccion(destino, ruta) {
  const base = destino.origin;
  const url = ruta ? base + ruta : base + '/';
  const js = ruta ? `location.replace(${JSON.stringify(url)} + location.hash)` : `location.replace(${JSON.stringify(base)} + location.pathname + location.search + location.hash)`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Franco Gonzalez — nueva dirección</title>
<link rel="canonical" href="${url}"><meta name="robots" content="noindex">
${ruta ? `<meta http-equiv="refresh" content="0; url=${url}">` : ''}<script>${js}</script></head>
<body style="font-family:system-ui;background:#0a0c0e;color:#eceff1;padding:2rem">El portfolio se mudó a <a style="color:#3fd0c0" href="${url}">${url}</a></body></html>\n`;
}

git(['add', '-A']);
// GitHub Pages: sirve los videos (y la dirección vieja del sitio)
if (leer('git', ['status', '--porcelain'], COPIA)) {
  git(['commit', '-q', '-m', `Publicación ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`]);
  git(['push', '-q', 'origin', 'gh-pages']);
}

// Netlify: guarda los cambios del proyecto en GitHub con la marca [publicar],
// que es la señal para que Netlify publique (ver netlify.toml)
const fecha = new Date().toISOString().slice(0, 16).replace('T', ' ');
const raiz = (args) => correr('git', ['-c', 'user.name=Franco Gonzalez', '-c', 'user.email=publicar@localhost', ...args]);
raiz(['add', '-A']);
raiz(['commit', '-q', '--allow-empty', '-m', `Cambios del sitio ${fecha} [publicar]`]);
raiz(['push', '-q', 'origin', 'HEAD']);

console.log('\n✓ Listo. En 1 o 2 minutos el sitio está actualizado.\n');
