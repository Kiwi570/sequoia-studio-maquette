/* Serveur local qui imite Vercel pour l'audit : cleanUrls (adresses sans .html, redirection 308
   de /page.html vers /page), dossiers servis par leur index, 404.html avec le statut 404,
   en-têtes de vercel.json appliqués. Les fichiers exclus par .vercelignore ne sont pas servis. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.pdf': 'application/pdf', '.ics': 'text/calendar',
};

function lireVercel(racine) {
  try { return JSON.parse(readFileSync(join(racine, 'vercel.json'), 'utf8')); } catch { return {}; }
}

function exclusions(racine) {
  try {
    return readFileSync(join(racine, '.vercelignore'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
      .map((l) => new RegExp('^/' + l.replace(/^\//, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '(/|$)'));
  } catch { return []; }
}

export function demarrerServeur(racine, { port = 0 } = {}) {
  const vercel = lireVercel(racine);
  const exclus = exclusions(racine);
  const entetes = [];
  for (const h of vercel.headers || []) {
    const motif = new RegExp('^' + h.source.replace(/\(\.\*\)/g, '.*').replace(/:(\w+)\*/g, '.*').replace(/:(\w+)/g, '[^/]+') + '$');
    entetes.push({ motif, valeurs: h.headers });
  }
  const journal = [];

  const serveur = createServer((req, res) => {
    const url = new URL(req.url, 'http://local');
    let p = decodeURIComponent(url.pathname);
    const envoyer = (code, fichier, extra = {}) => {
      const h = { 'Content-Type': TYPES[extname(fichier).toLowerCase()] || 'application/octet-stream', ...extra };
      for (const e of entetes) if (e.motif.test(p)) for (const v of e.valeurs) h[v.key] = v.value;
      const corps = readFileSync(fichier);
      h['Content-Length'] = corps.length;
      res.writeHead(code, h);
      res.end(req.method === 'HEAD' ? undefined : corps);
      journal.push({ code, chemin: p });
    };
    const introuvable = () => {
      const f = join(racine, '404.html');
      if (existsSync(f)) envoyer(404, f); else { res.writeHead(404); res.end('404'); journal.push({ code: 404, chemin: p }); }
    };
    if (exclus.some((r) => r.test(p))) return introuvable();
    const sur = normalize(p).replace(/^(\.\.[/\\])+/, '');
    if (vercel.cleanUrls && /\.html$/.test(sur)) {
      const propre = sur.replace(/\/index\.html$/, '/').replace(/\.html$/, '') || '/';
      res.writeHead(308, { Location: propre + url.search });
      res.end();
      return;
    }
    const brut = join(racine, sur);
    if (existsSync(brut) && statSync(brut).isFile()) return envoyer(200, brut);
    const candidats = [join(racine, sur.replace(/\/$/, '') + '.html'), join(racine, sur, 'index.html')];
    for (const c of candidats) if (existsSync(c) && statSync(c).isFile()) return envoyer(200, c);
    return introuvable();
  });

  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => {
    const adresse = `http://127.0.0.1:${serveur.address().port}`;
    ok({ adresse, journal, fermer: () => new Promise((r) => serveur.close(r)) });
  }));
}
