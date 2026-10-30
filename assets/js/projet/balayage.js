/* Balayage de lumière en WebGL entre deux œuvres (seul usage de WebGL sur les œuvres) : pendant la transition,
   une bande de lumière chaude traverse l'image et découvre la suivante ; au repos, l'œuvre est affichée telle
   quelle (aucun filtre). Rendu à la demande seulement (aucune boucle au repos), densité de pixels bornée,
   qualité réduite si les images sont lentes. Sans WebGL : fondu des images (version de repli). */
const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; v.y = 1. - v.y; gl_Position = vec4(p, 0., 1.); }`;
const FS = `precision mediump float;
varying vec2 v; uniform sampler2D a; uniform sampler2D b; uniform float t; uniform vec2 sa; uniform vec2 sb; uniform vec2 ecran;
vec4 lire(sampler2D s, vec2 taille, vec2 uv){
  float re = ecran.x / ecran.y, ri = taille.x / taille.y;
  vec2 k = re > ri ? vec2(re / ri, 1.) : vec2(1., ri / re);
  vec2 q = (uv - .5) * k + .5;
  if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1.) return vec4(0.);
  return texture2D(s, q);
}
void main(){
  vec4 ca = lire(a, sa, v), cb = lire(b, sb, v);
  float x = v.x * .82 + (1. - v.y) * .18;
  float bord = t * 1.4 - .2;
  float m = smoothstep(bord - .08, bord + .08, x);
  vec4 c = mix(cb, ca, m);
  float bande = exp(-pow((x - bord) / .06, 2.)) * step(.001, t) * step(t, .999);
  c.rgb += vec3(1., .86, .6) * bande * .55 * c.a;
  gl_FragColor = c;
}`;

export function creerBalayage(canvas) {
  let gl = null;
  try { gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: false }); } catch {}
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('programme');
  } catch (err) { console.warn('[balayage]', err); return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const u = { a: U('a'), b: U('b'), t: U('t'), sa: U('sa'), sb: U('sb'), ecran: U('ecran') };
  gl.uniform1i(u.a, 0); gl.uniform1i(u.b, 1);
  const tex = [gl.createTexture(), gl.createTexture()];
  const taille = [[1, 1], [1, 1]];
  tex.forEach((t) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); });
  let dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(max-width: 760px)').matches ? 1 : 1.25);
  const dimensionner = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u.ecran, canvas.width, canvas.height);
  };
  const charger = (k, img) => {
    gl.activeTexture(k ? gl.TEXTURE1 : gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[k]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    taille[k] = [img.naturalWidth, img.naturalHeight];
    gl.uniform2f(k ? u.sb : u.sa, taille[k][0], taille[k][1]);
  };
  const dessiner = (t) => { gl.uniform1f(u.t, t); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  let raf = 0;
  return {
    dimensionner,
    montrer(img) { dimensionner(); charger(0, img); charger(1, img); dessiner(0); },
    /* Transition de l'image affichée vers img (durée en ms). */
    vers(img, duree = 950) {
      cancelAnimationFrame(raf);
      charger(1, img);
      const t0 = performance.now();
      let lentes = 0;
      let avant = t0;
      const pas = (t) => {
        const p = Math.min(1, (t - t0) / duree);
        if (t - avant > 34 && ++lentes > 4 && dpr > 0.75) { dpr = 0.75; dimensionner(); }
        avant = t;
        dessiner(p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
        if (p < 1) raf = requestAnimationFrame(pas); else { charger(0, img); dessiner(0); }
      };
      raf = requestAnimationFrame(pas);
    },
  };
}
