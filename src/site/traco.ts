import gsap from 'gsap';

// Traço SVG que se desenha (o efeito do DrawSVG, com a mesma conta por fotograma). A diferença está em
// como se sabe o comprimento de cada traço: o DrawSVG pergunta ao navegador (getBBox, getTotalLength,
// getComputedStyle) no momento em que a animação lá chega, a meio do scroll, e cada pergunta obriga a
// refazer estilos e layout. Nos caminhos do logótipo e do brasão (milhares de curvas) isso eram segundos
// parados num telemóvel fraco. Aqui o comprimento sai das próprias coordenadas, em JavaScript, uma vez só.

// Comprimento de um atributo d (comandos M L H V C S Q T Z). Arcos (A) ficam para o navegador.
const porD = new Map<string, number>();
const NUMERO = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
const NOS = [0, -0.5384693101056831, 0.5384693101056831, -0.906179845938664, 0.906179845938664];
const PESOS = [0.5688888888888889, 0.4786286704993665, 0.4786286704993665, 0.2369268850561891, 0.2369268850561891];

// Curva de Bézier cúbica: integra a velocidade com Gauss-Legendre e divide ao meio até a conta estabilizar.
function cubica(p: number[], a = 0, b = 1, fundo = 0): number {
  const troco = (u: number, v: number) => {
    let s = 0;
    for (let k = 0; k < 5; k++) {
      const t = (u + v) / 2 + ((v - u) / 2) * NOS[k], m = 1 - t;
      const dx = 3 * (m * m * (p[2] - p[0]) + 2 * m * t * (p[4] - p[2]) + t * t * (p[6] - p[4]));
      const dy = 3 * (m * m * (p[3] - p[1]) + 2 * m * t * (p[5] - p[3]) + t * t * (p[7] - p[5]));
      s += PESOS[k] * Math.hypot(dx, dy);
    }
    return (s * (v - u)) / 2;
  };
  const meio = (a + b) / 2, todo = troco(a, b), partes = troco(a, meio) + troco(meio, b);
  if (fundo > 8 || Math.abs(todo - partes) <= 1e-7 * Math.max(1, partes)) return partes;
  return cubica(p, a, meio, fundo + 1) + cubica(p, meio, b, fundo + 1);
}

function comprimentoD(d: string) {
  const t = d.match(NUMERO) ?? [];
  let i = 0, cmd = '', x = 0, y = 0, x0 = 0, y0 = 0, cx = 0, cy = 0, qx = 0, qy = 0, total = 0, antes = '';
  const n = () => Number(t[i++]);
  while (i < t.length) {
    if (/[a-z]/i.test(t[i])) cmd = t[i++];
    const C = cmd.toUpperCase(), rel = cmd !== C, bx = rel ? x : 0, by = rel ? y : 0;
    let nx = x, ny = y;
    if (C === 'M') { x = x0 = bx + n(); y = y0 = by + n(); cmd = rel ? 'l' : 'L'; antes = 'M'; continue; }
    if (C === 'Z') { total += Math.hypot(x0 - x, y0 - y); x = x0; y = y0; antes = 'Z'; continue; }
    if (C === 'L') { nx = bx + n(); ny = by + n(); total += Math.hypot(nx - x, ny - y); }
    else if (C === 'H') { nx = bx + n(); total += Math.abs(nx - x); }
    else if (C === 'V') { ny = by + n(); total += Math.abs(ny - y); }
    else if (C === 'C' || C === 'S') {
      const [x1, y1] = C === 'C' ? [bx + n(), by + n()] : /[CS]/.test(antes) ? [2 * x - cx, 2 * y - cy] : [x, y];
      cx = bx + n(); cy = by + n(); nx = bx + n(); ny = by + n();
      total += cubica([x, y, x1, y1, cx, cy, nx, ny]);
    } else if (C === 'Q' || C === 'T') {
      if (C === 'Q') { qx = bx + n(); qy = by + n(); } else if (/[QT]/.test(antes)) { qx = 2 * x - qx; qy = 2 * y - qy; } else { qx = x; qy = y; }
      nx = bx + n(); ny = by + n();
      total += cubica([x, y, x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), nx + (2 / 3) * (qx - nx), ny + (2 / 3) * (qy - ny), nx, ny]);
    } else return NaN;
    x = nx; y = ny; antes = C;
  }
  return total;
}

// Comprimento de qualquer forma, como o DrawSVG o calcula para as formas simples.
const num = (el: Element, a: string) => parseFloat(el.getAttribute(a) ?? '') || 0;
export function comprimento(el: SVGGeometryElement) {
  switch (el.tagName.toLowerCase()) {
    case 'path': {
      const d = el.getAttribute('d') ?? '';
      if (!porD.has(d)) { const c = comprimentoD(d); porD.set(d, Number.isFinite(c) ? c : el.getTotalLength()); }
      return porD.get(d)!;
    }
    case 'line': return Math.hypot(num(el, 'x2') - num(el, 'x1'), num(el, 'y2') - num(el, 'y1'));
    case 'rect': return 2 * (num(el, 'width') + num(el, 'height'));
    case 'circle': case 'ellipse': {
      const rx = num(el, el.tagName === 'circle' ? 'r' : 'rx'), ry = num(el, el.tagName === 'circle' ? 'r' : 'ry');
      return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    }
    case 'polyline': case 'polygon': {
      const p = (el.getAttribute('points')?.match(NUMERO) ?? []).map(Number);
      if (el.tagName === 'polygon') p.push(p[0], p[1]);
      let s = 0; for (let k = 2; k < p.length; k += 2) s += Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]);
      return s;
    }
    default: return el.getTotalLength();
  }
}

// O plugin: valores como no DrawSVG ("100%", "0% 100%", "20 80"). O ponto de partida é o último
// estado desenhado (guardado aqui), em vez de o ler do estilo calculado.
const _round = (v: number) => Math.round(v * 10000) / 10000;
const parte = (v: string, L: number) => (v.includes('%') ? (parseFloat(v) / 100) * L : parseFloat(v) || 0);
const estado = new WeakMap<Element, [number, number]>();
const core = gsap.core as unknown as { reverting?: () => boolean; getStyleSaver?: (t: Element, p: string) => { revert: () => void } };

gsap.registerPlugin({
  name: 'traco',
  init(this: any, alvo: SVGGeometryElement, valor: string, tween: gsap.core.Tween) {
    if (!alvo.getBBox) return false;
    const L = comprimento(alvo);
    valor = String(valor);
    if (valor === 'true') valor = '0 100%'; else if (!valor) valor = '0 0'; else if (!valor.includes(' ')) valor = `0 ${valor}`;
    const inicio = estado.get(alvo) ?? [0, L];
    const [s, e] = valor.split(' ').map(v => parte(v, L));
    const fim = s > e ? [e, s] : [s, e];
    this.styles = core.getStyleSaver?.(alvo, 'strokeDashoffset,strokeDasharray');
    this.tween = tween;
    this._alvo = alvo;
    this._style = alvo.style;
    this._length = _round(L);
    this._dash = _round(inicio[1] - inicio[0]);
    this._offset = _round(-inicio[0]);
    this.add(this, '_dash', this._dash, _round(fim[1] - fim[0]), 0, 0, 0, 0, 0, 1);
    this.add(this, '_offset', this._offset, _round(-fim[0]), 0, 0, 0, 0, 0, 1);
    this._props.push('traco');
    return 1;
  },
  render(ratio: number, data: any) {
    if (data.tween._time || !core.reverting?.()) {
      let pt = data._pt;
      if (!pt) return;
      while (pt) { pt.r(ratio, pt.d); pt = pt._next; }
      const dash = data._dash || (ratio && ratio !== 1 && 0.0001) || 0;
      let length = data._length - dash + 0.1, offset = data._offset;
      if (dash && offset && dash + Math.abs(offset % data._length) > data._length - 0.05) { offset += offset < 0 ? 0.005 : -0.005; length += 0.005; }
      const desvio = dash ? offset : offset + 0.001;
      data._style.strokeDashoffset = desvio;
      data._style.strokeDasharray = length < 0.1 ? 'none' : dash ? `${dash}px,${length}px` : '0px, 999999px';
      // O que o DrawSVG voltaria a ler deste estilo na animação seguinte.
      const visto = length < 0.1 ? data._length : Math.min(dash, data._length);
      estado.set(data._alvo, [-desvio, visto - desvio]);
    } else {
      data.styles?.revert();
      estado.delete(data._alvo);
    }
  },
});
