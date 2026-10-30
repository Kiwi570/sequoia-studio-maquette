/* Dimensions d'une image (WebP, PNG, JPEG, GIF, SVG) lues dans l'en-tête du fichier, sans dépendance. */
import { readFileSync } from 'node:fs';

export function dimensions(fichier) {
  const b = readFileSync(fichier);
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const type = b.toString('ascii', 12, 16);
    if (type === 'VP8X') return { largeur: 1 + b.readUIntLE(24, 3), hauteur: 1 + b.readUIntLE(27, 3) };
    if (type === 'VP8L') {
      const n = b.readUInt32LE(21);
      return { largeur: 1 + (n & 0x3fff), hauteur: 1 + ((n >> 14) & 0x3fff) };
    }
    if (type === 'VP8 ') return { largeur: b.readUInt16LE(26) & 0x3fff, hauteur: b.readUInt16LE(28) & 0x3fff };
  }
  if (b.readUInt32BE(0) === 0x89504e47) return { largeur: b.readUInt32BE(16), hauteur: b.readUInt32BE(20) };
  if (b.toString('ascii', 0, 3) === 'GIF') return { largeur: b.readUInt16LE(6), hauteur: b.readUInt16LE(8) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { hauteur: b.readUInt16BE(i + 5), largeur: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  const s = b.toString('utf8', 0, Math.min(b.length, 4000));
  if (/<svg/i.test(s)) {
    const vb = s.match(/viewBox=["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    const w = s.match(/<svg[^>]*\swidth=["']([\d.]+)/i), h = s.match(/<svg[^>]*\sheight=["']([\d.]+)/i);
    if (w && h) return { largeur: +w[1], hauteur: +h[1] };
    if (vb) return { largeur: +vb[1], hauteur: +vb[2] };
  }
  return null;
}
