// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import sitio from './config/sitio.json' with { type: 'json' };

export default defineConfig({
  // La URL pública sale de /config/sitio.json (se usa en el sitemap y en Open Graph)
  site: sitio.url,
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Barlow Condensed',
      cssVariable: '--font-barlow',
      weights: [500, 600, 700],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Arial Narrow', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Hanken Grotesk',
      cssVariable: '--font-hanken',
      weights: [400, 500, 600, 700],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
