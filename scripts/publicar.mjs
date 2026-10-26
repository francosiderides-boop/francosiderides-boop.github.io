#!/usr/bin/env node
// Arma el sitio y lo sube a la rama gh-pages de GitHub, que es la que publica GitHub Pages.
//   npm run publicar
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(RAIZ, 'dist');
const correr = (cmd, args, cwd = RAIZ) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const leer = (cmd, args) => execFileSync(cmd, args, { cwd: RAIZ, encoding: 'utf8' }).trim();

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
fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true });
correr('git', ['init', '-q', '-b', 'gh-pages'], DIST);
correr('git', ['add', '-A'], DIST);
correr(
  'git',
  ['-c', 'user.name=Publicador del portfolio', '-c', 'user.email=publicar@localhost', 'commit', '-q', '-m', `Publicación ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`],
  DIST,
);
correr('git', ['push', '-q', '--force', remoto, 'gh-pages'], DIST);
fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true });

console.log('\n✓ Listo. En 1 o 2 minutos el sitio está actualizado.\n');
