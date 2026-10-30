#!/usr/bin/env node
/* Photographie les pages _partage/*.html (écrites par generer.mjs) en 1200×630
   et écrit assets/partage/<page>-<langue>.jpg (JPG : jamais de WebP pour le partage).
   Usage : node outils/images-partage.mjs   (après node outils/generer.mjs) */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

const serveur = createServer((req, res) => {
  const p = join(racine, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(racine) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0);
const port = serveur.address().port;

mkdirSync(join(racine, 'assets/partage'), { recursive: true });
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const fichiers = readdirSync(join(racine, '_partage')).filter((f) => f.endsWith('.html'));
for (const f of fichiers) {
  await page.goto(`http://localhost:${port}/_partage/${f}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const sortie = join(racine, 'assets/partage', f.replace(/\.html$/, '.jpg'));
  await page.screenshot({ path: sortie, type: 'jpeg', quality: 86 });
  console.log('OK', 'assets/partage/' + f.replace(/\.html$/, '.jpg'));
}
await navigateur.close();
serveur.close();
