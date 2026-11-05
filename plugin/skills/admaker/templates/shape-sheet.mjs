// 간단한 도형 PNG 여러 장을 한 번에 — 모든 도형을 시트 SVG 한 장에 칸으로 배치해 한 번만 래스터화한 뒤 칸마다 잘라 PNG로 만든다.
// 도형마다 브라우저·캔버스를 따로 띄우는 것보다 훨씬 빠르다(래스터화 1번 + 자르기 N번).
// 이 파일은 순수 모듈이다(파일·브라우저 접근 없음). CLI는 shape-pngs.mjs, admaker 앱 MCP는 make_shape_pngs 도구가 같은 코드를 쓴다.
//
//   import { buildShapeSheets, rasterizeSheets } from "./shape-sheet.mjs";
//   const { sheets, cells } = buildShapeSheets(items, { scale: 2 });
//   const result = await page.evaluate(rasterizeSheets, sheets);   // Playwright, Electron은 executeJavaScript
//
// items[]: { name, width, height, 그리고 shape 또는 svg 중 하나 }
//   shape: rect | roundRect | circle | ellipse | triangle | diamond | polygon | star | burst | heart | arrow | ring | line
//   svg:   "<svg viewBox=...>...</svg>" 전체 마크업 (손으로 그린 모양). viewBox가 있으면 width/height를 생략해도 된다.
//   스타일: fill(색 또는 { from, to, angle } 그라데이션), stroke { color, width, dash? }, opacity, rotate(도),
//           padding(칸 안쪽 여백 px), radius(roundRect 모서리), sides(polygon), points·innerRatio(star·burst),
//           thickness(ring 굵기 비율 0~1), headRatio(arrow 머리 길이 비율), shadow { color, blur, x, y }

export const SHAPE_KINDS = ["rect", "roundRect", "circle", "ellipse", "triangle", "diamond", "polygon", "star", "burst", "heart", "arrow", "ring", "line"];

const MAX_ITEMS = 200;
const MAX_SIDE = 4096; // 도형 한 장의 최대 픽셀
const DEFAULT_SHEET_MAX = 8192; // 시트 한 변의 최대 픽셀 (넘치면 시트를 나눈다)

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const r2 = (n) => Math.round(n * 100) / 100;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** 파일 이름으로 쓸 수 있는 이름 (겹치면 -2, -3 …) */
function safeNames(items) {
  const seen = new Map();
  return items.map((it, i) => {
    let base = String(it.name ?? `shape-${i + 1}`).trim().replace(/\.png$/i, "").replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "") || `shape-${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base}-${n}` : base;
  });
}

function polyPoints(pts) {
  return pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ");
}

function regular(cx, cy, rx, ry, n, start = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}

function starPts(cx, cy, rx, ry, points, inner) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const k = i % 2 ? inner : 1;
    out.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]);
  }
  return out;
}

/** 도형 하나 → SVG 요소 문자열 (0,0 ~ w,h 상자 안, 선 굵기만큼 안쪽으로) */
function shapeElement(it, w, h, paint) {
  const sw = it.stroke ? num(it.stroke.width, 0) : 0;
  // 그림자는 칸 밖으로 잘리지 않게 기본 여백을 둔다
  const shadowPad = it.shadow ? num(it.shadow.blur, 6) + Math.max(Math.abs(num(it.shadow.x, 0)), Math.abs(num(it.shadow.y, 4))) : 0;
  const pad = Math.max(0, num(it.padding, shadowPad)) + (it.shape === "line" ? 0 : sw / 2);
  const x = pad, y = pad, bw = Math.max(0.5, w - pad * 2), bh = Math.max(0.5, h - pad * 2);
  const cx = x + bw / 2, cy = y + bh / 2;
  switch (it.shape) {
    case "rect":
      return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(bw)}" height="${r2(bh)}"${paint}/>`;
    case "roundRect": {
      const rad = Math.min(num(it.radius, Math.min(bw, bh) * 0.2), bw / 2, bh / 2);
      return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(bw)}" height="${r2(bh)}" rx="${r2(rad)}"${paint}/>`;
    }
    case "circle": {
      const rr = Math.min(bw, bh) / 2;
      return `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(rr)}"${paint}/>`;
    }
    case "ellipse":
      return `<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(bw / 2)}" ry="${r2(bh / 2)}"${paint}/>`;
    case "triangle":
      return `<polygon points="${polyPoints([[cx, y], [x + bw, y + bh], [x, y + bh]])}"${paint}/>`;
    case "diamond":
      return `<polygon points="${polyPoints([[cx, y], [x + bw, cy], [cx, y + bh], [x, cy]])}"${paint}/>`;
    case "polygon":
      return `<polygon points="${polyPoints(regular(cx, cy, bw / 2, bh / 2, Math.max(3, Math.round(num(it.sides, 6)))))}"${paint}/>`;
    case "star":
    case "burst": {
      const pts = Math.max(3, Math.round(num(it.points, it.shape === "burst" ? 16 : 5)));
      const inner = Math.min(0.98, Math.max(0.05, num(it.innerRatio, it.shape === "burst" ? 0.8 : 0.45)));
      return `<polygon points="${polyPoints(starPts(cx, cy, bw / 2, bh / 2, pts, inner))}"${paint}/>`;
    }
    case "heart": {
      // 0~1 정규 좌표의 하트를 상자에 맞춘다
      const P = (px, py) => `${r2(x + px * bw)},${r2(y + py * bh)}`;
      const d = `M${P(0.5, 0.95)} C${P(0.2, 0.75)} ${P(0, 0.55)} ${P(0, 0.32)} C${P(0, 0.12)} ${P(0.16, 0.02)} ${P(0.3, 0.02)} C${P(0.4, 0.02)} ${P(0.47, 0.08)} ${P(0.5, 0.17)} C${P(0.53, 0.08)} ${P(0.6, 0.02)} ${P(0.7, 0.02)} C${P(0.84, 0.02)} ${P(1, 0.12)} ${P(1, 0.32)} C${P(1, 0.55)} ${P(0.8, 0.75)} ${P(0.5, 0.95)} Z`;
      return `<path d="${d}"${paint}/>`;
    }
    case "arrow": {
      // 오른쪽을 가리킨다. 다른 방향은 rotate로
      const head = Math.min(0.9, Math.max(0.1, num(it.headRatio, 0.4))) * bw;
      const shaft = bh * 0.38;
      const pts = [[x, cy - shaft / 2], [x + bw - head, cy - shaft / 2], [x + bw - head, y], [x + bw, cy], [x + bw - head, y + bh], [x + bw - head, cy + shaft / 2], [x, cy + shaft / 2]];
      return `<polygon points="${polyPoints(pts)}"${paint}/>`;
    }
    case "ring": {
      const ro = Math.min(bw, bh) / 2;
      const t = Math.min(0.95, Math.max(0.02, num(it.thickness, 0.25)));
      const ri = ro * (1 - t);
      const d = `M${r2(cx - ro)},${r2(cy)} a${r2(ro)},${r2(ro)} 0 1,0 ${r2(ro * 2)},0 a${r2(ro)},${r2(ro)} 0 1,0 ${r2(-ro * 2)},0 Z M${r2(cx - ri)},${r2(cy)} a${r2(ri)},${r2(ri)} 0 1,1 ${r2(ri * 2)},0 a${r2(ri)},${r2(ri)} 0 1,1 ${r2(-ri * 2)},0 Z`;
      return `<path d="${d}" fill-rule="evenodd"${paint}/>`;
    }
    case "line": {
      // 굵기 = 상자 높이(stroke.width로 바꿈), 둥근 끝이 칸 밖으로 나가지 않게 양끝을 굵기 절반만큼 안으로
      const lw = Math.min(bh, sw || bh * 0.6);
      return `<line x1="${r2(x + lw / 2)}" y1="${r2(cy)}" x2="${r2(x + bw - lw / 2)}" y2="${r2(cy)}"${paint} stroke-width="${r2(lw)}"/>`;
    }
    default:
      throw new Error(`모르는 shape "${it.shape}" (${SHAPE_KINDS.join(", ")})`);
  }
}

/** 칠하기 속성과 필요한 <defs> (id는 칸마다 접두사로 겹치지 않게) */
function paintFor(it, prefix, w, h) {
  const defs = [];
  const attrs = [];
  const fill = it.shape === "line" ? "none" : it.fill ?? (it.stroke ? "none" : "#000000");
  if (fill && typeof fill === "object") {
    const id = `${prefix}grad`;
    const a = (num(fill.angle, 90) - 90) * (Math.PI / 180); // CSS linear-gradient 각도: 0 = 아래→위, 90 = 왼→오(기본), 180 = 위→아래
    const dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    defs.push(`<linearGradient id="${id}" x1="${r2(0.5 - dx)}" y1="${r2(0.5 - dy)}" x2="${r2(0.5 + dx)}" y2="${r2(0.5 + dy)}"><stop offset="0" stop-color="${esc(fill.from ?? "#ffffff")}"/><stop offset="1" stop-color="${esc(fill.to ?? "#000000")}"/></linearGradient>`);
    attrs.push(`fill="url(#${id})"`);
  } else attrs.push(`fill="${esc(fill)}"`);
  if (it.stroke) {
    const width = it.shape === "line" ? "" : ` stroke-width="${r2(num(it.stroke.width, 2))}"`; // line은 shapeElement가 굵기를 정한다
    attrs.push(`stroke="${esc(it.stroke.color ?? "#000000")}"${width} stroke-linejoin="round" stroke-linecap="round"`);
    if (Array.isArray(it.stroke.dash) && it.stroke.dash.length) attrs.push(`stroke-dasharray="${it.stroke.dash.map(Number).join(" ")}"`);
  } else if (it.shape === "line") {
    attrs.push(`stroke="${esc(typeof it.fill === "string" ? it.fill : "#000000")}" stroke-linecap="round"`);
  }
  if (it.opacity != null) attrs.push(`opacity="${r2(Math.min(1, Math.max(0, num(it.opacity, 1))))}"`);
  if (it.shadow) {
    const id = `${prefix}shadow`;
    const s = it.shadow;
    defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${r2(num(s.x, 0))}" dy="${r2(num(s.y, 4))}" stdDeviation="${r2(num(s.blur, 6) / 2)}" flood-color="${esc(s.color ?? "#000000")}" flood-opacity="${r2(num(s.opacity, 0.35))}"/></filter>`);
    attrs.push(`filter="url(#${id})"`);
  }
  return { defs: defs.join(""), paint: ` ${attrs.join(" ")}` };
}

/** 직접 그린 SVG → { viewBox, inner, width, height } (id·url(#…)·href="#…"는 칸 접두사로 바꿔 시트 안에서 겹치지 않게) */
function parseSvg(markup, prefix) {
  const src = String(markup).trim();
  const open = src.match(/<svg\b[^>]*>/i);
  if (!open) throw new Error("svg에 <svg> 태그가 없습니다");
  const end = src.lastIndexOf("</svg>");
  let inner = src.slice(open.index + open[0].length, end === -1 ? undefined : end);
  const attr = (n) => open[0].match(new RegExp(`\\b${n}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  const vb = attr("viewBox");
  const wAttr = parseFloat(attr("width")), hAttr = parseFloat(attr("height"));
  const vbn = vb ? vb.trim().split(/[\s,]+/).map(Number) : null;
  const width = Number.isFinite(wAttr) ? wAttr : vbn?.[2];
  const height = Number.isFinite(hAttr) ? hAttr : vbn?.[3];
  inner = inner
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\bid\s*=\s*(["'])([^"']+)\1/g, (_, q, id) => `id=${q}${prefix}${id}${q}`)
    .replace(/url\(\s*#([^)\s]+)\s*\)/g, (_, id) => `url(#${prefix}${id})`)
    .replace(/(\bhref\s*=\s*["'])#([^"']+)/g, (_, a, id) => `${a}#${prefix}${id}`);
  return { viewBox: vb ?? (width && height ? `0 0 ${width} ${height}` : null), inner, width, height, par: attr("preserveAspectRatio") };
}

/** 칸 하나의 SVG 조각 (viewBox = 도형 자체 좌표) */
function cellSvg(it, i, w, h) {
  const prefix = `c${i}-`;
  if (it.svg) {
    const p = parseSvg(it.svg, prefix);
    return { viewBox: p.viewBox ?? `0 0 ${w} ${h}`, body: p.inner, par: p.par };
  }
  if (!it.shape) throw new Error(`${it.name ?? i}: shape 또는 svg가 필요합니다`);
  const { defs, paint } = paintFor(it, prefix, w, h);
  const rot = num(it.rotate, 0);
  let el;
  if (!rot) el = shapeElement(it, w, h, paint);
  else {
    // 돌린 뒤에도 칸(w×h) 안에 다 들어오게: 90°에 가까우면 가로·세로를 바꿔 그리고, 그래도 넘치면 같은 비율로 줄인다
    const a = (rot * Math.PI) / 180, c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
    let [w0, h0] = sn > c ? [h, w] : [w, h];
    const k = Math.min(1, w / (w0 * c + h0 * sn), h / (w0 * sn + h0 * c));
    w0 *= k; h0 *= k;
    el = `<g transform="translate(${r2((w - w0) / 2)} ${r2((h - h0) / 2)}) rotate(${r2(rot)} ${r2(w0 / 2)} ${r2(h0 / 2)})">${shapeElement(it, w0, h0, paint)}</g>`;
  }
  return { viewBox: `0 0 ${w} ${h}`, body: (defs ? `<defs>${defs}</defs>` : "") + el };
}

/** 줄 채우기(높은 것부터): 시트 너비를 넘으면 다음 줄, 시트 높이를 넘으면 다음 시트 */
function pack(boxes, maxSide, gap) {
  const order = boxes.map((b, i) => i).sort((a, b) => boxes[b].ph - boxes[a].ph || boxes[b].pw - boxes[a].pw);
  const total = boxes.reduce((s, b) => s + (b.pw + gap) * (b.ph + gap), 0);
  // 정사각형에 가깝게: 시트 너비 = √넓이 (가장 넓은 도형보다는 크게)
  const widest = Math.max(...boxes.map((b) => b.pw));
  const width = Math.min(maxSide, Math.max(widest + gap * 2, Math.ceil(Math.sqrt(total) * 1.15)));
  const sheets = [];
  let cur = null;
  let x = 0, y = 0, rowH = 0;
  const newSheet = () => {
    cur = { cells: [], width: 0, height: 0 };
    sheets.push(cur);
    x = gap; y = gap; rowH = 0;
  };
  newSheet();
  for (const i of order) {
    const b = boxes[i];
    if (x + b.pw + gap > width && x > gap) { x = gap; y += rowH + gap; rowH = 0; }
    if (y + b.ph + gap > maxSide && cur.cells.length) { newSheet(); }
    cur.cells.push({ index: i, x, y, w: b.pw, h: b.ph });
    cur.width = Math.max(cur.width, x + b.pw + gap);
    cur.height = Math.max(cur.height, y + b.ph + gap);
    x += b.pw + gap;
    rowH = Math.max(rowH, b.ph);
  }
  return sheets;
}

/**
 * 도형 목록 → 시트(들)
 * @param {Array<object>} items
 * @param {{ scale?: number, gap?: number, maxSheetSide?: number, background?: string }} [opts]
 *   scale: 픽셀 배율(기본 1 — width·height가 곧 PNG 픽셀), gap: 칸 사이 여백 px(기본 4), background: 시트 배경(기본 투명)
 * @returns {{ sheets: Array<{ svg, width, height, cells: Array<{ index, name, x, y, w, h }> }>, cells: Array<{ name, width, height, sheet }> }}
 */
export function buildShapeSheets(items, opts = {}) {
  if (!Array.isArray(items) || !items.length) throw new Error("items가 비었습니다");
  if (items.length > MAX_ITEMS) throw new Error(`한 번에 ${MAX_ITEMS}개까지 만들 수 있습니다`);
  const scale = Math.min(8, Math.max(0.1, num(opts.scale, 1)));
  const gap = Math.max(1, Math.round(num(opts.gap, 4)));
  const maxSheetSide = Math.min(16384, Math.max(256, Math.round(num(opts.maxSheetSide, DEFAULT_SHEET_MAX))));
  const names = safeNames(items);

  const prepared = items.map((it, i) => {
    let w = num(it.width, NaN), h = num(it.height, NaN);
    if (it.svg && (!Number.isFinite(w) || !Number.isFinite(h))) {
      const p = parseSvg(it.svg, "");
      if (!Number.isFinite(w)) w = Number.isFinite(h) && p.width && p.height ? (h * p.width) / p.height : p.width;
      if (!Number.isFinite(h)) h = p.width && p.height ? (w * p.height) / p.width : p.height;
    }
    if (!Number.isFinite(w)) w = Number.isFinite(h) ? h : 256;
    if (!Number.isFinite(h)) h = w;
    const pw = Math.max(1, Math.round(w * scale)), ph = Math.max(1, Math.round(h * scale));
    if (pw > MAX_SIDE || ph > MAX_SIDE) throw new Error(`${names[i]}: ${pw}x${ph}px — 한 장은 ${MAX_SIDE}px까지입니다`);
    if (pw + gap * 2 > maxSheetSide || ph + gap * 2 > maxSheetSide) throw new Error(`${names[i]}: 시트(${maxSheetSide}px)보다 큽니다`);
    return { it, w, h, pw, ph, ...cellSvg(it, i, w, h) };
  });

  const sheets = pack(prepared, maxSheetSide, gap).map((s, si) => {
    const parts = s.cells.map((c) => {
      const p = prepared[c.index];
      return `<svg x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" viewBox="${esc(p.viewBox)}"${p.par ? ` preserveAspectRatio="${esc(p.par)}"` : ""} overflow="hidden">${p.body}</svg>`;
    });
    const bg = opts.background ? `<rect width="100%" height="100%" fill="${esc(opts.background)}"/>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}">${bg}${parts.join("")}</svg>`;
    return { svg, width: s.width, height: s.height, cells: s.cells.map((c) => ({ ...c, name: names[c.index], sheet: si })) };
  });

  const cells = items.map((_, i) => {
    for (const s of sheets) {
      const c = s.cells.find((x) => x.index === i);
      if (c) return { name: names[i], width: c.w, height: c.h, sheet: c.sheet };
    }
    return null;
  });
  return { sheets, cells };
}

/**
 * 브라우저 안에서 실행 — 시트마다 SVG를 한 번 그리고 칸마다 잘라 PNG data URL로.
 * 바깥 변수를 쓰지 않는다(Playwright page.evaluate·Electron executeJavaScript로 문자열째 넘긴다).
 * @param {Array<{ svg, width, height, cells }>} sheets
 * @param {{ keepSheet?: boolean }} [opts]
 * @returns {Promise<{ sheets: Array<string|null>, pngs: Array<{ index, dataUrl }>, ms: number }>}
 */
export async function rasterizeSheets(sheets, opts = {}) {
  const t0 = performance.now();
  const out = { sheets: [], pngs: [], ms: 0 };
  for (const s of sheets) {
    const img = new Image();
    // decode()는 숨긴 창에서 다음 화면 갱신까지 기다려 몇 초씩 늦어진다 → onload
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("시트 SVG를 그리지 못했습니다 (svg 마크업 확인)"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.svg);
    });
    const canvas = document.createElement("canvas");
    canvas.width = s.width;
    canvas.height = s.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, s.width, s.height);
    out.sheets.push(opts && opts.keepSheet ? canvas.toDataURL("image/png") : null);
    for (const c of s.cells) {
      const piece = document.createElement("canvas");
      piece.width = c.w;
      piece.height = c.h;
      piece.getContext("2d").drawImage(canvas, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
      out.pngs.push({ index: c.index, dataUrl: piece.toDataURL("image/png") });
    }
  }
  out.pngs.sort((a, b) => a.index - b.index);
  out.ms = Math.round(performance.now() - t0);
  return out;
}
