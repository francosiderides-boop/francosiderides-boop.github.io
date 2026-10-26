#!/usr/bin/env node
// Arma el sitio y lo sube a la rama gh-pages de GitHub, que es la que publica GitHub Pages.
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

// Reemplaza el contenido por el sitio nuevo (sin tocar .git)
for (const f of fs.readdirSync(COPIA)) if (f !== '.git') fs.rmSync(path.join(COPIA, f), { recursive: true, force: true });
fs.cpSync(DIST, COPIA, { recursive: true });

git(['add', '-A']);
if (!leer('git', ['status', '--porcelain'], COPIA)) {
  console.log('\nNo había cambios para publicar.\n');
  process.exit(0);
}
git(['commit', '-q', '-m', `Publicación ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`]);
git(['push', '-q', 'origin', 'gh-pages']);

console.log('\n✓ Listo. En 1 o 2 minutos el sitio está actualizado.\n');
