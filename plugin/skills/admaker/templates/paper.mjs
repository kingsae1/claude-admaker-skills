// 종이 질감 SVG — references/paper.md. 엔진·앱 공통(SVG data URL Image 클립. 앱은 불러올 때 PNG로 래스터화)
// paperSvg: 화면 가득한 종이 한 장(바탕색·구김·결·섬유·접힘·구긴 면·얼룩) — 그래픽 장면의 바탕
// paperSvg({ overlay: true }): 흰 바탕 결만, 그래픽 장면 맨 위에 multiply로 얹어 글자·조각이 같은 종이에 찍힌 듯
//   ※ 영상·사진 소재 위에는 얹지 않는다(사용자 확인 2026-11-18: 소재 위 구김 오버레이는 별로)
// paperCutSvg: 가장자리가 찢긴(데클 엣지) 종이 조각 — 콜라주·라벨·카드·테이프
// SVG 필터(feTurbulence·feDiffuseLighting·feDisplacementMap)만 쓴다. 무작위는 seed로 고정(같은 seed = 같은 종이).

const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const r2 = (v) => Math.round(v * 100) / 100;
export const svgUrl = (svg) => "data:image/svg+xml;base64," + (typeof Buffer !== "undefined" ? Buffer.from(svg).toString("base64") : btoa(unescape(encodeURIComponent(svg))));

// 종이 톤 프리셋
export const PAPER_TONES = {
  white: "#F6F3EC",     // 미색 모조지
  cream: "#EFE6D2",     // 크림 도화지
  kraft: "#C9A57A",     // 크라프트(갈색 봉투)
  newsprint: "#E4E0D5", // 신문지
  gray: "#D9D7D2",      // 회색 판지
};

// 질감 필터: 원본(SourceGraphic) × 구김 음영 × 고운 결. 강도 0–1
// 빛 결과(평평한 면 = sin(고도))를 평평한 면이 0.98 근처가 되게 늘려서 곱한다.
const shade = (id, inName, k, elev) => {
  const flat = Math.sin((elev * Math.PI) / 180), sl = r2(k), ic = r2(0.98 - k * flat);
  const f = (c) => `<feFunc${c} type="linear" slope="${sl}" intercept="${ic}"/>`;
  return `<feColorMatrix in="${inName}" type="saturate" values="0" result="${id}g"/><feComponentTransfer in="${id}g" result="${id}">${f("R")}${f("G")}${f("B")}</feComponentTransfer>`;
};
function paperFilter(id, { seed, crumple, grain, scale }) {
  const c = crumple, g = grain, e = 50;
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">`
    // 구김: 낮은 주파수 노이즈를 비스듬한 빛으로 비춰 넓은 요철 음영
    + `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.004 / scale * 1000) / 1000}" numOctaves="4" seed="${seed}" result="cn"/>`
    + `<feDiffuseLighting in="cn" surfaceScale="${r2(4 + 14 * c)}" lighting-color="#ffffff" result="cl"><feDistantLight azimuth="235" elevation="${e}"/></feDiffuseLighting>`
    + shade("crum", "cl", 0.9 * c, e)
    // 고운 결: 높은 주파수 노이즈 → 펄프 요철
    + `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.7 / scale * 100) / 100}" numOctaves="3" seed="${seed + 7}" result="gn"/>`
    + `<feDiffuseLighting in="gn" surfaceScale="${r2(0.8 + 1.6 * g)}" lighting-color="#ffffff" result="gl"><feDistantLight azimuth="235" elevation="${e}"/></feDiffuseLighting>`
    + shade("grn", "gl", 0.55 * g, e)
    + `<feBlend in="SourceGraphic" in2="crum" mode="multiply" result="a"/>`
    + `<feBlend in="a" in2="grn" mode="multiply" result="b"/>`
    + `<feComposite in="b" in2="SourceGraphic" operator="in"/>`
    + `</filter>`;
}

// 섬유: 짧게 휜 털 같은 선. 어두운 것과 밝은 것을 섞는다
function fibers(rnd, W, H, n, ink) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, len = 4 + rnd() * 16, a = rnd() * Math.PI * 2, bend = (rnd() - 0.5) * len * 0.4;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const cx = (x + x2) / 2 - Math.sin(a) * bend, cy = (y + y2) / 2 + Math.cos(a) * bend;
    const light = rnd() < 0.35;
    s += `<path d="M${r2(x)} ${r2(y)}Q${r2(cx)} ${r2(cy)} ${r2(x2)} ${r2(y2)}" stroke="${light ? "#ffffff" : ink}" stroke-width="${r2(0.5 + rnd() * 0.9)}" opacity="${r2(light ? 0.2 + rnd() * 0.25 : 0.04 + rnd() * 0.1)}" fill="none" stroke-linecap="round"/>`;
  }
  return s;
}

// 얼룩·티끌: 작은 점 + 아주 옅은 물 얼룩
function specks(rnd, W, H, n, ink, stains) {
  let s = "";
  for (let i = 0; i < n; i++) s += `<circle cx="${r2(rnd() * W)}" cy="${r2(rnd() * H)}" r="${r2(0.5 + rnd() * rnd() * 2.6)}" fill="${ink}" opacity="${r2(0.08 + rnd() * 0.22)}"/>`;
  for (let i = 0; i < stains; i++) {
    const rx = 60 + rnd() * 200, ry = rx * (0.6 + rnd() * 0.5);
    s += `<ellipse cx="${r2(rnd() * W)}" cy="${r2(rnd() * H)}" rx="${r2(rx)}" ry="${r2(ry)}" fill="none" stroke="${ink}" stroke-width="${r2(1 + rnd() * 2)}" opacity="${r2(0.03 + rnd() * 0.03)}" filter="url(#soft)"/>`;
  }
  return s;
}

// 접힌 자국: 선 하나 기준으로 한쪽은 어둡게, 접힌 능선은 밝은 선 + 어두운 선
function folds(rnd, W, H, count, ink) {
  let s = "";
  const D = Math.hypot(W, H);
  for (let i = 0; i < count; i++) {
    const vertical = i % 2 === 0;
    const pos = vertical ? W * (0.3 + rnd() * 0.4) : H * (0.25 + rnd() * 0.5);
    const tilt = (rnd() - 0.5) * 6;
    const cx = vertical ? pos : W / 2, cy = vertical ? H / 2 : pos;
    const rot = (vertical ? 90 : 0) + tilt;
    s += `<g transform="translate(${r2(cx)} ${r2(cy)}) rotate(${r2(rot)})">`
      + `<rect x="${r2(-D)}" y="0" width="${r2(D * 2)}" height="${r2(D)}" fill="url(#foldShade)"/>`
      + `<line x1="${r2(-D)}" y1="-1.2" x2="${r2(D)}" y2="-1.2" stroke="#ffffff" stroke-width="2" opacity="0.55"/>`
      + `<line x1="${r2(-D)}" y1="0.8" x2="${r2(D)}" y2="0.8" stroke="${ink}" stroke-width="1.2" opacity="0.22"/>`
      + `</g>`;
  }
  return s;
}

// 구긴 종이: 흔들린 격자를 삼각형으로 나눠 면마다 기울기를 다르게(빛 받는 면은 밝게, 반대면은 어둡게),
// 일부 모서리에는 접힌 능선(밝은 선 + 어두운 선). 구겼다 편 종이처럼 각진 면이 생긴다.
function facets(rnd, W, H, amount, scale, ink) {
  const cell = 120 * scale, cols = Math.ceil(W / cell) + 2, rows = Math.ceil(H / cell) + 2;
  const P = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
    P.push([(i - 1 + (rnd() - 0.5) * 0.9) * cell, (j - 1 + (rnd() - 0.5) * 0.9) * cell]);
  const at = (i, j) => P[j * cols + i];
  const L = [-0.55, -0.65, 0.52]; // 왼쪽 위에서 오는 빛
  let polys = "", ridges = "";
  const tri = (a, b, c) => {
    const tx = (rnd() - 0.5) * 1.6 * amount, ty = (rnd() - 0.5) * 1.6 * amount;
    const n = [tx, ty, 1], m = Math.hypot(...n);
    const d = (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / m - L[2];
    const pts = [a, b, c].map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ");
    polys += d >= 0
      ? `<polygon points="${pts}" fill="#ffffff" opacity="${r2(Math.min(0.35, d * 0.6))}"/>`
      : `<polygon points="${pts}" fill="${ink}" opacity="${r2(Math.min(0.16, -d * 0.28))}"/>`;
  };
  const ridge = (a, b) => {
    if (rnd() > 0.35) return;
    const o = r2(0.2 + rnd() * 0.3);
    ridges += `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="#ffffff" stroke-width="1.3" opacity="${o}"/>`
      + `<line x1="${r2(a[0] + 1.2)}" y1="${r2(a[1] + 1.2)}" x2="${r2(b[0] + 1.2)}" y2="${r2(b[1] + 1.2)}" stroke="${ink}" stroke-width="1" opacity="${r2(o * 0.5)}"/>`;
  };
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    if (rnd() < 0.5) { tri(a, b, c); tri(a, c, d); ridge(a, c); } else { tri(a, b, d); tri(b, c, d); ridge(b, d); }
    ridge(a, b); ridge(a, d);
  }
  return `<g filter="url(#facetSoft)">${polys}</g><g filter="url(#ridgeWarp)">${ridges}</g>`;
}

/**
 * 화면 가득한 종이. 그래픽 장면 바탕으로 깔거나, overlay:true면 흰 바탕 결만(그래픽 장면 맨 위 multiply. 소재 위에는 쓰지 않음).
 * @param {object} o
 * @param {number} o.W, o.H
 * @param {string} [o.tone]     PAPER_TONES 키 또는 색 (#hex)
 * @param {number} [o.crumple]  구김 0–1 (기본 0.5)
 * @param {number} [o.crease]   구겨진 주름 0–1 (기본 0, 구긴 종이를 편 느낌)
 * @param {number} [o.grain]    고운 결 0–1 (기본 0.6)
 * @param {number} [o.fiber]    섬유 0–1 (기본 0.5)
 * @param {number} [o.fold]     접힌 자국 개수 0–4 (기본 0)
 * @param {number} [o.speck]    티끌·얼룩 0–1 (기본 0.4)
 * @param {number} [o.scale]    결 크기 배율 (기본 1, 클수록 굵음)
 * @param {boolean} [o.overlay] true면 흰색 바탕(곱하기용 오버레이, style.blendMode "multiply")
 */
export function paperSvg({ W, H, tone = "white", crumple = 0.5, crease = 0, grain = 0.6, fiber = 0.5, fold = 0, speck = 0.4, scale = 1, seed = 11, overlay = false }) {
  const rnd = rng(seed * 7919 + 13);
  const base = overlay ? "#FFFFFF" : (PAPER_TONES[tone] ?? tone);
  const ink = overlay ? "#3a3530" : "#4a3b28";
  const area = (W * H) / (1080 * 1920);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<defs>${paperFilter("pf", { seed, crumple, grain, scale })}`
    + `<filter id="soft"><feGaussianBlur stdDeviation="3"/></filter><filter id="facetSoft" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="${seed + 5}" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="${r2(18 * scale)}" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="${r2(2.2 * scale)}"/></filter><filter id="ridgeWarp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="${seed + 5}" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="${r2(18 * scale)}" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.5"/></filter>`
    + `<linearGradient id="foldShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ink}" stop-opacity="0.10"/><stop offset="0.12" stop-color="${ink}" stop-opacity="0.03"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></linearGradient>`
    + `</defs>`
    + `<rect width="${W}" height="${H}" fill="${base}" filter="url(#pf)"/>`
    + (crease > 0 ? facets(rnd, W, H, crease, scale, ink) : "")
    + fibers(rnd, W, H, Math.round(1400 * fiber * area), ink)
    + folds(rnd, W, H, fold, ink)
    + specks(rnd, W, H, Math.round(260 * speck * area), ink, Math.round(4 * speck))
    + `</svg>`;
}

// 찢긴 가장자리 다각형: 네 변을 잘게 나눠 안쪽으로 들쭉날쭉
function deckle(rnd, w, h, pad, rough) {
  const pts = [];
  const side = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(8, Math.round(len / 7));
    let drift = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      drift = drift * 0.6 + (rnd() - 0.5) * rough;
      const d = Math.abs(drift) + rnd() * rough * 0.35;
      pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]);
    }
  };
  side(pad, pad, w - pad, pad, 0, 1);
  side(w - pad, pad, w - pad, h - pad, -1, 0);
  side(w - pad, h - pad, pad, h - pad, 0, -1);
  side(pad, h - pad, pad, pad, 1, 0);
  return "M" + pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join("L") + "Z";
}

/**
 * 찢긴 종이 조각(투명 바탕 SVG). 그림자와 흰 섬유 단면(찢긴 자리의 흰 테두리) 포함.
 * @param {object} o
 * @param {number} o.w, o.h      조각 크기(px, 그림자 여백 포함)
 * @param {string} [o.color]     종이 색
 * @param {number} [o.rough]     찢김 거칠기 px (기본 9)
 * @param {boolean} [o.shadow]   아래 그림자 (기본 true)
 */
export function paperCutSvg({ w, h, color = "#F6F3EC", rough = 9, shadow = true, seed = 3, crumple = 0.35, grain = 0.7 }) {
  const rnd = rng(seed * 104729 + 7);
  const pad = 18;
  const outer = deckle(rnd, w, h, pad, rough);
  const rnd2 = rng(seed * 104729 + 7);
  const inner = deckle(rnd2, w, h, pad + 3.5, rough * 0.9); // 흰 단면 안쪽(같은 seed라 결이 맞음)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<defs>${paperFilter("pf", { seed, crumple, grain, scale: 1 })}`
    + `<filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="5"/></filter></defs>`
    + (shadow ? `<path d="${outer}" transform="translate(4 9)" fill="#000" opacity="0.28" filter="url(#sh)"/>` : "")
    + `<path d="${outer}" fill="#FBFAF6" filter="url(#pf)"/>`
    + `<path d="${inner}" fill="${color}" filter="url(#pf)"/>`
    + `</svg>`;
}
