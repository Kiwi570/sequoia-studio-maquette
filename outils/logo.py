#!/usr/bin/env python3
"""Logo Sequoia pour fond nuit : l'arbre gravé passe en ivoire (gravure inversée), les trois cercles gardent
leurs couleurs. Retire le petit trait blanc parasite du fichier d'origine (sous le cercle rouge).
Écrit assets/images/logo-nuit-<taille>.png, logo.svg, logo-clair.svg, favicon.svg, apple-touch-icon.png.
Usage : python3 outils/logo.py recu/site/logo/sequoia-logo.png"""
import base64, colorsys, io, sys
from pathlib import Path
from PIL import Image
RACINE = Path(__file__).resolve().parent.parent
IVOIRE, NUIT = (242, 237, 228), (11, 11, 12)

def nuit(src):
    im = Image.open(src).convert('RGBA')
    px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0: continue
            _, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            # trait parasite : pixels clairs isolés sous le cercle rouge
            if 420 <= x <= 455 and 840 <= y <= 965 and s < 0.3:
                px[x, y] = (0, 0, 0, 0); continue
            if s < 0.28 or l < 0.16:            # gravure de l'arbre (noir et blanc) et bords sombres
                t = l                            # 0 = noir -> ivoire ; 1 = blanc -> nuit
                c = tuple(round(IVOIRE[i] * (1 - t) + NUIT[i] * t) for i in range(3))
                # le blanc du tronc devient transparent pour laisser voir le fond nuit
                px[x, y] = c + (round(a * (1 - 0.82 * max(0, (t - 0.55) / 0.45))),)
    return im.crop(im.getbbox())

def carre(im, taille, fond=None, marge=0.06):
    c = Image.new('RGBA', (taille, taille), fond + (255,) if fond else (0, 0, 0, 0))
    m = round(taille * marge); im2 = im.copy(); im2.thumbnail((taille - 2 * m, taille - 2 * m), Image.LANCZOS)
    c.alpha_composite(im2, ((taille - im2.width) // 2, (taille - im2.height) // 2)); return c

def svg(im, taille, chemin):
    b = io.BytesIO(); carre(im, taille).save(b, 'WEBP', quality=90, method=6)
    d = base64.b64encode(b.getvalue()).decode()
    chemin.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {taille} {taille}" width="{taille}" height="{taille}"><image width="{taille}" height="{taille}" href="data:image/webp;base64,{d}" xlink:href="data:image/webp;base64,{d}"/></svg>\n')
    return chemin.stat().st_size

if __name__ == '__main__':
    im = nuit(sys.argv[1]); dest = RACINE / 'assets/images'
    for t in (256, 512, 1024):
        carre(im, t, marge=0.02).save(dest / f'logo-nuit-{t}.png', optimize=True)
        carre(im, t, marge=0.02).save(dest / f'logo-nuit-{t}.webp', 'WEBP', quality=88, method=6)
    print('logo.svg', svg(im, 160, dest / 'logo.svg') // 1024, 'Ko')
    print('logo-clair.svg', svg(im, 192, dest / 'logo-clair.svg') // 1024, 'Ko')
    print('favicon.svg', svg(im, 64, dest / 'favicon.svg') // 1024, 'Ko')
    carre(im, 180, fond=NUIT, marge=0.1).convert('RGB').save(dest / 'apple-touch-icon.png', optimize=True)
    print('OK')
