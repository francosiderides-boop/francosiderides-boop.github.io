/**
 * Convierte un enlace de YouTube o Vimeo en la dirección del reproductor embebido.
 * Usa las versiones que no dejan cookies de seguimiento.
 */
export function urlEmbebida(url: string): { plataforma: 'YouTube' | 'Vimeo'; src: string } | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtu.be' || host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    const id =
      host === 'youtu.be'
        ? u.pathname.slice(1)
        : u.searchParams.get('v') || u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    if (!id) return null;
    return { plataforma: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` };
  }

  if (host.endsWith('vimeo.com')) {
    // vimeo.com/123456, vimeo.com/123456/hash, player.vimeo.com/video/123456?h=hash
    const partes = u.pathname.split('/').filter(Boolean);
    const i = partes.findIndex((p) => /^\d+$/.test(p));
    if (i === -1) return null;
    const hash = u.searchParams.get('h') || (partes[i + 1] && /^[a-f0-9]+$/i.test(partes[i + 1]) ? partes[i + 1] : '');
    const params = new URLSearchParams({ autoplay: '1', dnt: '1' });
    if (hash) params.set('h', hash);
    return { plataforma: 'Vimeo', src: `https://player.vimeo.com/video/${partes[i]}?${params}` };
  }

  return null;
}
