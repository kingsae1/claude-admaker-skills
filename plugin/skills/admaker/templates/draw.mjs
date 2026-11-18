// 드로잉 도우미 — 점·펜 패스·손그림 강조·글자 패스를 엔진 Shape 클립(path/brush)으로 만든다.
// 계산은 @admaker/engine src/shapes/pen.ts·annotations.ts·text-path.ts와 같다(엔진 없이 Node에서 돌도록 옮긴 것). admaker 앱 MCP(src/mcp/skill/draw.mjs)와 같은 파일이니 한쪽을 고치면 같이 고친다.
// 사용법: references/drawing.md

const fmt = (n) => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

/** 명령 배열({op,x,y,...}) → SVG d */
export function pathToSvg(cmds) {
  return cmds
    .map((c) => {
      if (c.op === 'M' || c.op === 'L') return `${c.op}${fmt(c.x)} ${fmt(c.y)}`;
      if (c.op === 'C') return `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`;
      if (c.op === 'Q') return `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`;
      return 'Z';
    })
    .join(' ');
}

function pairs(points) {
  const out = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const x = Number(points[i]);
    const y = Number(points[i + 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push([x, y]);
  }
  return out;
}

/** 거의 직선인 점 빼기 (Ramer–Douglas–Peucker). points = [x0, y0, x1, y1, ...] */
export function simplifyPoints(points, tolerance = 1) {
  const p = pairs(points);
  if (p.length <= 2) return p.flat();
  const keep = new Uint8Array(p.length);
  keep[0] = keep[p.length - 1] = 1;
  const stack = [[0, p.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = p[a];
    const [bx, by] = p[b];
    const len = Math.hypot(bx - ax, by - ay);
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = p[i];
      const d = len > 0 ? Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / len : Math.hypot(x - ax, y - ay);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tolerance) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return p.filter((_, i) => keep[i]).flat();
}

/** 점을 지나는 부드러운 곡선 (Catmull–Rom → 3차 베지어) */
export function smoothPoints(points, { closed = false, tension = 1 } = {}) {
  const p = pairs(points);
  if (!p.length) return [];
  const isClosed = closed && p.length > 2;
  const t = Math.max(0, Math.min(1, tension)) / 6;
  const out = [{ op: 'M', x: p[0][0], y: p[0][1] }];
  if (p.length === 1) return out;
  const at = (i) => (isClosed ? p[(i + p.length) % p.length] : p[Math.max(0, Math.min(p.length - 1, i))]);
  const count = isClosed ? p.length : p.length - 1;
  for (let i = 0; i < count; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    out.push({
      op: 'C',
      x1: p1[0] + (p2[0] - p0[0]) * t,
      y1: p1[1] + (p2[1] - p0[1]) * t,
      x2: p2[0] - (p3[0] - p1[0]) * t,
      y2: p2[1] - (p3[1] - p1[1]) * t,
      x: p2[0],
      y: p2[1],
    });
  }
  if (isClosed) out.push({ op: 'Z' });
  return out;
}

/** 시드 고정 난수 — 같은 seed면 손그림 흔들림이 매번 같다 */
export function seededRandom(seed) {
  let s = Math.floor(Math.abs(seed) * 9973) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** M/L/C/Q/Z 명령 → 서브패스별 폴리라인 */
function flatten(cmds) {
  const out = [];
  let pts = [];
  let sx = 0;
  let sy = 0;
  let cx = 0;
  let cy = 0;
  const finish = (closed) => {
    if (closed && pts.length >= 2 && (pts[pts.length - 2] !== pts[0] || pts[pts.length - 1] !== pts[1])) pts.push(pts[0], pts[1]);
    if (pts.length >= 4) out.push({ points: pts, closed });
    pts = [];
  };
  for (const c of cmds) {
    if (c.op === 'M') {
      finish(false);
      pts = [c.x, c.y];
      sx = cx = c.x;
      sy = cy = c.y;
    } else if (c.op === 'Z') {
      finish(true);
      cx = sx;
      cy = sy;
    } else {
      if (!pts.length) pts = [cx, cy];
      if (c.op === 'L') pts.push(c.x, c.y);
      else {
        const n = 16;
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const u = 1 - t;
          if (c.op === 'C') {
            pts.push(
              u * u * u * cx + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
              u * u * u * cy + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
            );
          } else {
            pts.push(u * u * cx + 2 * u * t * c.x1 + t * t * c.x, u * u * cy + 2 * u * t * c.y1 + t * t * c.y);
          }
        }
      }
      cx = c.x;
      cy = c.y;
    }
  }
  finish(false);
  return out;
}

function lengthOf(points) {
  let len = 0;
  for (let i = 2; i < points.length; i += 2) len += Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
  return len;
}

function resample(points, n) {
  const segs = [];
  let total = 0;
  for (let i = 2; i < points.length; i += 2) {
    const l = Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
    segs.push(l);
    total += l;
  }
  if (total <= 0) return points.slice(0, 2);
  const out = [];
  let seg = 0;
  let walked = 0;
  for (let k = 0; k <= n; k++) {
    const target = (total * k) / n;
    while (seg < segs.length - 1 && walked + segs[seg] < target) walked += segs[seg++];
    const t = segs[seg] > 0 ? Math.min(1, (target - walked) / segs[seg]) : 0;
    const i = seg * 2;
    out.push(points[i] + (points[i + 2] - points[i]) * t, points[i + 1] + (points[i + 3] - points[i + 1]) * t);
  }
  return out;
}

/** 손그림처럼 흔들기 — step px마다 다시 찍은 점을 amount px 안에서 부드럽게 밀고 다시 다듬는다 */
export function roughenPath(cmds, { amount = 2, step = 12, seed = 1 } = {}) {
  const amt = Math.max(0, amount);
  const st = Math.max(2, step);
  const rand = seededRandom(seed);
  const out = [];
  for (const line of flatten(cmds)) {
    const n = Math.max(2, Math.round(lengthOf(line.points) / st));
    const samples = resample(line.points, n);
    const knots = Array.from({ length: Math.ceil(n / 3) + 2 }, () => (rand() * 2 - 1) * amt);
    const count = samples.length / 2;
    const jittered = [];
    for (let i = 0; i < count; i++) {
      const k = i / 3;
      const k0 = Math.floor(k);
      const f = k - k0;
      const e = f * f * (3 - 2 * f);
      const off = knots[k0] * (1 - e) + knots[k0 + 1] * e;
      const a = Math.max(0, i - 1);
      const b = Math.min(count - 1, i + 1);
      const dx = samples[b * 2] - samples[a * 2];
      const dy = samples[b * 2 + 1] - samples[a * 2 + 1];
      const l = Math.hypot(dx, dy) || 1;
      jittered.push(samples[i * 2] + (-dy / l) * off, samples[i * 2 + 1] + (dx / l) * off);
    }
    if (line.closed) jittered.splice(-2, 2);
    out.push(...smoothPoints(jittered, { closed: line.closed }));
  }
  return out;
}

export const ANNOTATION_KINDS = ['underline', 'doubleUnderline', 'strike', 'circle', 'box', 'arrow', 'check', 'cross', 'bracket'];

/** 손그림 강조 패스 — width×height 상자 안 좌표(viewBox [0,0,w,h]) */
export function annotationPath(kind, width, height, { seed = 7, roughness } = {}) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const rand = seededRandom(seed);
  const amount = Math.max(0, roughness ?? Math.min(w, h) * 0.015 + 0.5);
  const j = (v) => v + (rand() * 2 - 1) * amount;
  const line = (pts) => smoothPoints(pts, { tension: 0.6 });
  let cmds;
  switch (kind) {
    case 'doubleUnderline':
      cmds = [
        ...line([0, j(h * 0.35), w * 0.5, j(h * 0.3), w, j(h * 0.33)]),
        ...line([w * 0.06, j(h * 0.75), w * 0.55, j(h * 0.7), w * 0.96, j(h * 0.72)]),
      ];
      break;
    case 'strike':
      cmds = line([0, j(h * 0.55), w * 0.5, j(h * 0.48), w, j(h * 0.5)]);
      break;
    case 'circle': {
      const pts = [];
      const turns = 1.12;
      const steps = 28;
      const start = -Math.PI * 0.75;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = start + t * turns * Math.PI * 2;
        const r = 1 + (t - 0.5) * 0.06;
        pts.push(w / 2 + Math.cos(a) * (w / 2) * r * 0.97, h / 2 + Math.sin(a) * (h / 2) * r * 0.94);
      }
      cmds = line(pts);
      break;
    }
    case 'box':
      cmds = [
        { op: 'M', x: j(w * 0.02), y: j(h * 0.04) },
        { op: 'L', x: j(w * 0.98), y: j(h * 0.02) },
        { op: 'L', x: j(w * 0.97), y: j(h * 0.97) },
        { op: 'L', x: j(w * 0.03), y: j(h * 0.98) },
        { op: 'Z' },
      ];
      break;
    case 'arrow': {
      const tip = { x: w * 0.96, y: h * 0.2 };
      const head = Math.min(w, h) * 0.28;
      cmds = [
        ...line([w * 0.04, h * 0.85, w * 0.45, j(h * 0.7), w * 0.75, j(h * 0.4), tip.x, tip.y]),
        { op: 'M', x: tip.x - head, y: tip.y - head * 0.1 },
        { op: 'L', x: tip.x, y: tip.y },
        { op: 'L', x: tip.x - head * 0.35, y: tip.y + head * 0.9 },
      ];
      break;
    }
    case 'check':
      cmds = [
        { op: 'M', x: w * 0.04, y: h * 0.55 },
        { op: 'L', x: j(w * 0.38), y: h * 0.92 },
        { op: 'L', x: w * 0.96, y: h * 0.06 },
      ];
      break;
    case 'cross':
      cmds = [
        { op: 'M', x: j(w * 0.08), y: j(h * 0.08) },
        { op: 'L', x: j(w * 0.92), y: j(h * 0.92) },
        { op: 'M', x: j(w * 0.92), y: j(h * 0.08) },
        { op: 'L', x: j(w * 0.08), y: j(h * 0.92) },
      ];
      break;
    case 'bracket':
      cmds = [
        { op: 'M', x: w * 0.3, y: h * 0.02 },
        { op: 'Q', x1: w * 0.02, y1: h * 0.02, x: w * 0.06, y: h * 0.3 },
        { op: 'L', x: j(w * 0.06), y: h * 0.7 },
        { op: 'Q', x1: w * 0.02, y1: h * 0.98, x: w * 0.3, y: h * 0.98 },
        { op: 'M', x: w * 0.7, y: h * 0.02 },
        { op: 'Q', x1: w * 0.98, y1: h * 0.02, x: w * 0.94, y: h * 0.3 },
        { op: 'L', x: j(w * 0.94), y: h * 0.7 },
        { op: 'Q', x1: w * 0.98, y1: h * 0.98, x: w * 0.7, y: h * 0.98 },
      ];
      break;
    default:
      cmds = line([0, j(h * 0.55), w * 0.35, j(h * 0.45), w * 0.7, j(h * 0.5), w, j(h * 0.4)]);
  }
  const out = amount > 0 ? roughenPath(cmds, { amount: amount * 0.6, step: Math.max(8, Math.min(w, h) * 0.25), seed }) : cmds;
  return { path: pathToSvg(out), closed: kind === 'box' };
}

/**
 * 강조 표시를 대상 상자(x,y,width,height) 둘레에 놓을 클립 상자.
 * underline 계열은 대상 아래, circle·box·bracket은 여백을 두고 감싼다.
 */
export function annotationBox(kind, target, { pad } = {}) {
  const { x, y, width: w, height: h } = target;
  const p = pad ?? Math.round(Math.min(w, h) * 0.18 + 8);
  switch (kind) {
    case 'underline':
      return { x: x - p * 0.3, y: y + h - h * 0.05, width: w + p * 0.6, height: Math.max(16, h * 0.25) };
    case 'doubleUnderline':
      return { x: x - p * 0.3, y: y + h - h * 0.05, width: w + p * 0.6, height: Math.max(24, h * 0.35) };
    case 'strike':
      return { x: x - p * 0.3, y: y + h * 0.3, width: w + p * 0.6, height: h * 0.4 };
    case 'arrow': {
      const s = Math.max(80, Math.min(w, h) * 1.2);
      return { x: x - s * 1.05, y: y + h * 0.5 - s * 0.15, width: s, height: s * 0.6 };
    }
    case 'check':
    case 'cross': {
      const s = Math.max(40, Math.min(w, h));
      return { x: x + w + p * 0.5, y: y + (h - s) / 2, width: s, height: s };
    }
    default:
      return { x: x - p, y: y - p, width: w + p * 2, height: h + p * 2 };
  }
}

/** SVG d의 대략적인 범위 — 절대 좌표 M/L/C/Q/T/S/Z만 쓴 패스(직접 만든 패스)일 때만 맞다 */
export function roughBounds(d) {
  if (/[a-z]/.test(String(d).replace(/e[-+]?\d/gi, '')) || /[AHV]/.test(d)) return null;
  const nums = (String(d).match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
  if (nums.length < 2) return null;
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/**
 * 글자 → 패스. font는 opentype.js Font. 줄바꿈은 \n.
 * @returns {{ path: string, viewBox: number[], width: number, height: number }}
 */
export function textToPath(font, text, { fontSize = 100, lineHeight = 1.2, letterSpacing = 0, align = 'left', kerning = true } = {}) {
  const size = Math.max(1, fontSize);
  const lineH = size * lineHeight;
  const scale = size / font.unitsPerEm;
  const options = { kerning, letterSpacing: letterSpacing / size };
  const lines = String(text ?? '').split('\n');
  const widths = lines.map((l) => font.getAdvanceWidth(l, size, options));
  const width = Math.max(1, ...widths);
  const height = Math.max(lineH, lineH * (lines.length - 1) + (font.ascender - font.descender) * scale);
  const cmds = [];
  lines.forEach((line, i) => {
    const x = align === 'center' ? (width - widths[i]) / 2 : align === 'right' ? width - widths[i] : 0;
    const y = font.ascender * scale + i * lineH;
    for (const c of font.getPath(line, x, y, size, options).commands) {
      if (c.type === 'M' || c.type === 'L') cmds.push({ op: c.type, x: c.x, y: c.y });
      else if (c.type === 'C') cmds.push({ op: 'C', x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, x: c.x, y: c.y });
      else if (c.type === 'Q') cmds.push({ op: 'Q', x1: c.x1, y1: c.y1, x: c.x, y: c.y });
      else if (c.type === 'Z') cmds.push({ op: 'Z' });
    }
  });
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  return { path: pathToSvg(cmds), viewBox: [0, 0, w, h], width: w, height: h };
}

// ── 글자 속으로 (glyph dive) ─────────────────────────────────────────
// 소재를 글자 모양 매트(style.matte alpha) 안에 넣고, 글자 획 안의 한 점으로 수십 배 확대해 화면을 채운 뒤
// 매트 없는 같은 소재로 이어 붙이는 시그니처 전환. 획 안의 점은 사람이 재지 않고 패스에서 계산한다(shots/transition-glyph-dive.md).

/** pathToSvg 형식 d(M·L·C·Q·Z, 절대 좌표) → 닫힌 다각형 목록 [[x,y],...] */
export function pathPolygons(d, { segments = 8 } = {}) {
  const toks = String(d).match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const polys = [];
  let cur = null, px = 0, py = 0, i = 0;
  const num = () => Number(toks[i++]);
  while (i < toks.length) {
    const op = toks[i++].toUpperCase();
    if (op === 'M') { px = num(); py = num(); cur = [[px, py]]; polys.push(cur); }
    else if (op === 'L') { px = num(); py = num(); cur?.push([px, py]); }
    else if (op === 'Q') {
      const x1 = num(), y1 = num(), x = num(), y = num();
      for (let k = 1; k <= segments; k++) { const t = k / segments, u = 1 - t; cur?.push([u * u * px + 2 * u * t * x1 + t * t * x, u * u * py + 2 * u * t * y1 + t * t * y]); }
      px = x; py = y;
    } else if (op === 'C') {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
      for (let k = 1; k <= segments; k++) {
        const t = k / segments, u = 1 - t;
        cur?.push([u * u * u * px + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * py + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y]);
      }
      px = x; py = y;
    } else if (op === 'Z') { cur = null; }
  }
  return polys.filter((p) => p.length > 2);
}

function windingAt(polys, x, y) {
  let w = 0;
  for (const p of polys)
    for (let k = 0; k < p.length; k++) {
      const [ax, ay] = p[k], [bx, by] = p[(k + 1) % p.length];
      if (ay <= y) { if (by > y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0) w++; }
      else if (by <= y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0) w--;
    }
  return w;
}

function edgeDist(polys, x, y) {
  let best = Infinity;
  for (const p of polys)
    for (let k = 0; k < p.length; k++) {
      const [ax, ay] = p[k], [bx, by] = p[(k + 1) % p.length];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
  return best;
}

/**
 * 글자 패스 안에서 확대해 들어갈 점: 획 가장자리에서 가장 먼 점들 중(최대 반지름의 85% 이상) 원하는 쪽에 가까운 점.
 * @param {string} d  textToPath(...).path
 * @param {number} width  패스 박스 폭(viewBox 폭)
 * @param {number} height
 * @param {{ prefer?: 'center'|'left'|'right'|number, grid?: number }} [o]  number면 패스 박스 안 x 비율(0–1)
 * @returns {{ x: number, y: number, r: number }}  패스 박스 왼쪽 위 기준 px, r = 그 점에서 획 가장자리까지 거리
 */
export function glyphDivePoint(d, width, height, { prefer = 'center', grid = 4 } = {}) {
  const polys = pathPolygons(d);
  if (!polys.length) throw new Error('글자 패스가 비었습니다');
  const cand = [];
  for (let y = grid / 2; y < height; y += grid)
    for (let x = grid / 2; x < width; x += grid)
      if (windingAt(polys, x, y) !== 0) cand.push({ x, y, r: edgeDist(polys, x, y) });
  if (!cand.length) throw new Error('글자 획 안의 점을 찾지 못했습니다 (글자가 너무 가늘거나 작음)');
  const rMax = Math.max(...cand.map((c) => c.r));
  const fx = prefer === 'left' ? 0 : prefer === 'right' ? 1 : typeof prefer === 'number' ? prefer : 0.5;
  const tx = width * fx, ty = height / 2;
  const good = cand.filter((c) => c.r >= rMax * 0.85);
  good.sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty));
  const p = good[0];
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, r: Math.round(p.r * 10) / 10 };
}

/**
 * 글자 속으로 클립 묶음(엔진 ProjectJSON). 매트 Shape(글자 패스) + 매트를 건 소재 + 매트 없는 같은 소재.
 * @param {object} o
 * @param {{ path: string, width: number, height: number, viewBox: number[] }} o.glyph  textToPath 결과
 * @param {number} o.centerX  글자 박스 가운데 x(캔버스 px)
 * @param {number} o.centerY
 * @param {{ width: number, height: number }} o.canvas
 * @param {number} o.startSec  글자가 들어오는 시각
 * @param {number} o.diveSec  확대가 시작되는 시각(박)
 * @param {number} o.endSec  확대가 끝나 화면을 채우는 시각(다음 박·마디 첫 박). 이때 매트 없는 소재로 컷
 * @param {number} [o.untilSec]  매트 없는 소재가 끝나는 시각(없으면 endSec + 2)
 * @param {object} o.footage  소재 클립 공통 필드 { type: 'Video'|'Image', src, ... } (transform·timing은 여기서 채움)
 * @param {string} [o.id]  클립 id 앞머리(기본 'dive')
 * @param {string} [o.voice]  들어오는 말투: 'snap'(기본)·'crash'·'spring'
 * @param {'center'|'left'|'right'|number} [o.prefer]
 * @param {string} [o.bg]  글자 바깥 바탕 색(없으면 소재가 글자 안에서만 보이고 밖은 아래 트랙)
 * @returns {{ clips: object[], point: object, endScale: number }}
 */
export function glyphDiveClips(o) {
  const { glyph, centerX, centerY, canvas, startSec, diveSec, endSec, footage, id = 'dive', voice = 'snap', prefer = 'center', bg } = o;
  const untilSec = o.untilSec ?? endSec + 2;
  if (!(startSec < diveSec && diveSec < endSec)) throw new Error('startSec < diveSec < endSec 이어야 합니다');
  const us = (s) => Math.round(s * 1e6);
  const box = { x: Math.round(centerX - glyph.width / 2), y: Math.round(centerY - glyph.height / 2), width: glyph.width, height: glyph.height };
  const p = glyphDivePoint(glyph.path, glyph.width, glyph.height, { prefer });
  const P = { x: box.x + p.x, y: box.y + p.y };
  const C = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const far = Math.max(...[[0, 0], [canvas.width, 0], [0, canvas.height], [canvas.width, canvas.height]].map(([x, y]) => Math.hypot(x - P.x, y - P.y)));
  const endScale = Math.ceil((far / Math.max(1, p.r)) * 1.15);
  const at = (scale, extra = {}) => ({ scale, x: Math.round(-(P.x - C.x) * (scale - 1)), y: Math.round(-(P.y - C.y) * (scale - 1)), ...extra });
  const enter = { snap: [at(1.18, { opacity: 0 }), 'easeOutExpo', 0.3], crash: [at(2.4, { opacity: 0 }), 'easeOutExpo', 0.18], spring: [at(0.6, { opacity: 0 }), 'easeOutBack', 0.4] }[voice] ?? [at(1.18, { opacity: 0 }), 'easeOutExpo', 0.3];
  const d = endSec - startSec, pct = (t) => `${+(((t - startSec) / d) * 100).toFixed(2)}%`;
  const inEnd = Math.min(startSec + enter[2], diveSec - 0.05);
  const pre = Math.max(inEnd, diveSec - 0.12);
  const params = {
    '0%': { ...enter[0], easing: enter[1] },
    [pct(inEnd)]: at(1, { opacity: 1 }),
    ...(pre > inEnd ? { [pct(pre)]: { ...at(1, { opacity: 1 }), easing: 'easeInOutQuad' } } : {}),
    [pct(diveSec)]: { ...at(0.94, { opacity: 1 }), easing: 'easeInExpo' },
    '100%': at(endScale, { opacity: 1 }),
  };
  const full = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  const tm = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const clips = [
    ...(bg ? [{ id: `${id}_bg`, name: `${id}_bg`, type: 'Shape', src: 'shape', shapeType: 'rectangle', timing: tm(startSec, endSec), transform: { ...full, angle: 0, opacity: 1 }, style: { fill: bg }, animations: [] }] : []),
    { id: `${id}_in`, name: `${id}_in`, ...footage, timing: tm(startSec, endSec), transform: { ...full, angle: 0, opacity: 1, ...(footage.transform ?? {}) }, style: { ...(footage.style ?? {}), matte: { clipId: `${id}_glyph`, mode: 'alpha' } }, animations: footage.animations ?? [] },
    { id: `${id}_glyph`, name: `${id}_glyph`, type: 'Shape', src: 'shape', shapeType: 'path', timing: tm(startSec, endSec), transform: { ...box, angle: 0, opacity: 1 }, style: { path: glyph.path, viewBox: glyph.viewBox, fill: '#000000', fillOpacity: 1 }, animations: [{ type: 'keyframes', options: { duration: us(d), delay: 0, easing: 'linear' }, params }] },
    { id: `${id}_out`, name: `${id}_out`, ...footage, timing: tm(endSec, untilSec), transform: { ...full, angle: 0, opacity: 1, ...(footage.transform ?? {}) }, style: { ...(footage.style ?? {}) }, animations: [{ type: 'keyframes', options: { duration: us(untilSec - endSec), delay: 0, easing: 'linear' }, params: { '0%': { scale: 1.08, easing: 'easeOutExpo' }, '30%': { scale: 1 }, '100%': { scale: 1.03 } } }] },
  ];
  return { clips, point: { ...p, canvasX: Math.round(P.x), canvasY: Math.round(P.y) }, endScale };
}
