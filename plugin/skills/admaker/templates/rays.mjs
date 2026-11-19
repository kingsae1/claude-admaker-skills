// 방사선 배경(starburst) — references/shots/starburst-spin.md
// 가격·할인·오픈 소식 뒤에서 도는 만화풍 방사선. SVG 이미지 한 장 + 회전 keyframes만 쓰므로 엔진·앱 공통
// (앱은 SVG Image 클립을 불러올 때 PNG로 래스터화).
//
//   import { raysSvg, raysBox, raysSpin } from "./rays.mjs";
//   import { svgUrl } from "./paper.mjs";
//   const opt = { width: W, height: H, rays: 16, colors: ["#FFD23F", "#FF8A1F"], center: [0.5, 0.42] };
//   const clip = image("rays", svgUrl(raysSvg(opt)), a, b, raysBox(opt),
//     { animations: [raysSpin({ rays: 16, mode: "beat", beat: 60 / 120, duration: b - a })] });
//
// 이미지는 방사 중심이 가운데인 정사각형이고, 한 변 = 2 × (중심에서 가장 먼 화면 모서리까지 거리) × (1 + margin).
// 엔진은 클립 상자 가운데를 축으로 돌리므로 raysBox로 놓으면 어느 각도에서도 화면 모서리가 비지 않는다.
// SVG 호(arc) 문법: https://www.w3.org/TR/SVG2/paths.html#PathDataEllipticalArcCommands

const r2 = (v) => Math.round(v * 100) / 100;
const us = (s) => Math.round(s * 1e6);

/** 부채꼴 수: 12–48, 짝수(두 색 교대가 한 바퀴에서 끊기지 않도록) */
export function normRays(rays = 16) {
  const n = Math.max(12, Math.min(48, Math.round(Number(rays) || 16)));
  return n % 2 ? n + 1 : n;
}

/** 방사 중심 기준 정사각 이미지 상자(화면 좌표). 회전해도 화면 모서리가 비지 않는 크기 */
export function raysBox({ width, height, center = [0.5, 0.5], margin = 0.04 }) {
  const cx = center[0] * width, cy = center[1] * height;
  const far = Math.max(...[[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => Math.hypot(x - cx, y - cy)));
  const S = Math.ceil(2 * far * (1 + margin));
  return { x: r2(cx - S / 2), y: r2(cy - S / 2), width: S, height: S };
}

// 반경 r에서의 변 각도(도): 시작각 + twist × r / R
const pt = (cx, cy, r, deg) => { const a = (deg * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };

// 중심 → 바깥으로 가는 변. twist면 2차 베지어 여러 개로 나선 근사(제어점 = 2·중간점 − (양끝 평균) → 곡선이 중간점을 지남)
function edgeOut(cx, cy, R, a0, twist, segs) {
  let d = "";
  for (let s = 1; s <= segs; s++) {
    const ra = (R * (s - 1)) / segs, rb = (R * s) / segs, rm = (ra + rb) / 2;
    const A = pt(cx, cy, ra, a0 + (twist * ra) / R), B = pt(cx, cy, rb, a0 + (twist * rb) / R), M = pt(cx, cy, rm, a0 + (twist * rm) / R);
    if (!twist) d += `L${r2(B[0])} ${r2(B[1])}`;
    else d += `Q${r2(2 * M[0] - (A[0] + B[0]) / 2)} ${r2(2 * M[1] - (A[1] + B[1]) / 2)} ${r2(B[0])} ${r2(B[1])}`;
  }
  return d;
}
function edgeIn(cx, cy, R, a0, twist, segs) {
  let d = "";
  for (let s = segs; s >= 1; s--) {
    const ra = (R * (s - 1)) / segs, rb = (R * s) / segs, rm = (ra + rb) / 2;
    const A = pt(cx, cy, ra, a0 + (twist * ra) / R), B = pt(cx, cy, rb, a0 + (twist * rb) / R), M = pt(cx, cy, rm, a0 + (twist * rm) / R);
    if (!twist) d += `L${r2(A[0])} ${r2(A[1])}`;
    else d += `Q${r2(2 * M[0] - (A[0] + B[0]) / 2)} ${r2(2 * M[1] - (A[1] + B[1]) / 2)} ${r2(A[0])} ${r2(A[1])}`;
  }
  return d;
}

const hex = (c) => { const m = String(c).replace("#", ""); const f = m.length === 3 ? m.split("").map((x) => x + x).join("") : m; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
const mix = (a, b) => { try { const A = hex(a), B = hex(b); if (A.some(Number.isNaN) || B.some(Number.isNaN)) return a; return "#" + A.map((v, i) => Math.round((v + B[i]) / 2).toString(16).padStart(2, "0")).join(""); } catch { return a; } };

/**
 * 방사선 SVG 문자열.
 * @param {object} o
 * @param {number} o.width, o.height  화면 크기(px). 이미지 크기는 raysBox와 같다
 * @param {number} [o.rays=16]        부채꼴 수 12–48, 짝수로 맞춤. 많을수록 가늘고 빠르게 보임
 * @param {string[]} [o.colors]       [a, b] 두 색 교대. 같은 계열 두 톤(노랑·주황)이 만화풍, 보색은 시끄러움
 * @param {number[]} [o.center]       방사 중심 [cx, cy] (화면 비율 0–1). 가격·로고 위치에 맞춤
 * @param {number} [o.twist=0]        바깥 끝에서 변이 더 돌아간 각도(도). ±20–60이면 소용돌이
 * @param {number} [o.softness=0]     0–1. 중심에서 반경 × softness까지 두 색 중간색으로 흐리게(가운데 글자 받침)
 * @param {number} [o.margin=0.04]    raysBox 여백
 */
export function raysSvg({ width, height, rays = 16, colors = ["#FFD23F", "#FF8A1F"], center = [0.5, 0.5], twist = 0, softness = 0, margin = 0.04 } = {}) {
  if (!(width > 0 && height > 0)) throw new Error("raysSvg: width, height가 필요합니다");
  const n = normRays(rays);
  const { width: S } = raysBox({ width, height, center, margin });
  const c = S / 2, R = S * 0.75; // 정사각 모서리까지 칠하도록 반경을 넉넉히(√2/2 ≈ 0.707 이상)
  const step = 360 / n, tw = Number(twist) || 0, segs = tw ? Math.max(2, Math.ceil(Math.abs(tw) / 15)) : 1;
  const [ca, cb] = colors;
  let sectors = "";
  for (let k = 0; k < n; k++) {
    const a0 = -90 + k * step, a1 = a0 + step; // 12시 방향부터 시계 방향
    const E1 = pt(c, c, R, a1 + tw);
    // 중심 → 변0 바깥 끝 → 바깥 호(반지름 R, 작은 호 step < 180, sweep=1 = 화면에서 시계 방향) → 변1 따라 중심
    const d = `M${r2(c)} ${r2(c)}` + edgeOut(c, c, R, a0, tw, segs)
      + `A${r2(R)} ${r2(R)} 0 0 1 ${r2(E1[0])} ${r2(E1[1])}` + edgeIn(c, c, R, a1, tw, segs) + "Z";
    sectors += `<path d="${d}" fill="${k % 2 ? cb : ca}" data-ray="${k}"/>`;
  }
  const s = Math.max(0, Math.min(1, Number(softness) || 0));
  let defs = "", body;
  if (s > 0) {
    // 가운데는 마스크 0(투명) → 아래 중간색이 보이고, 반경 × softness에서 1(방사선 그대로)
    const far = (S / 2) / (1 + margin); // 가장 먼 화면 모서리까지 거리
    defs = `<radialGradient id="rsoft" gradientUnits="userSpaceOnUse" cx="${r2(c)}" cy="${r2(c)}" r="${r2(far * s)}"><stop offset="0" stop-color="#000"/><stop offset="0.35" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>`
      + `<mask id="rmask" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="url(#rsoft)"/></mask>`;
    body = `<rect width="${S}" height="${S}" fill="${mix(ca, cb)}"/><g mask="url(#rmask)"><rect width="${S}" height="${S}" fill="${cb}"/>${sectors}</g>`;
  } else {
    body = `<rect width="${S}" height="${S}" fill="${cb}"/>${sectors}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${defs}</defs>${body}</svg>`;
}

/**
 * 회전 keyframes(한 주기 + iterCount 반복). 주기 끝 각도는 처음과 같은 그림이 되는 각도라 반복 이음매가 없다.
 * @param {object} o
 * @param {number} o.rays
 * @param {"smooth"|"beat"} [o.mode="smooth"] smooth: 한 바퀴/period초 등속. beat: 박마다 딱 끊어 돌고 멈춤
 * @param {number} [o.period=10]  smooth 한 바퀴 초(8–12 권장)
 * @param {number} [o.beat]       beat 모드 박 길이(초) = 60 / BPM
 * @param {"pair"|"swap"} [o.step="pair"] beat 모드 한 박 회전량. pair = 720/rays(같은 색 띠가 다음 같은 색 자리로, 박마다 그림 동일)
 *                                swap = 360/rays(한 칸, 박마다 두 색이 뒤바뀌어 번쩍이는 느낌 — 주기는 2박)
 * @param {number} [o.snap=0.3]   beat 모드에서 한 박 중 도는 데 쓰는 비율(나머지는 정지)
 * @param {string} [o.easing="easeOutBack"] beat 모드 회전 이징(easeOutCubic이면 오버슈트 없음)
 * @param {number} [o.dir=1]      1 시계, −1 반시계
 * @param {number} o.duration     클립 길이(초) → iterCount
 */
export function raysSpin({ rays = 16, mode = "smooth", period = 10, beat, step = "pair", snap = 0.3, easing = "easeOutBack", dir = 1, duration, delay = 0 } = {}) {
  if (!(duration > 0)) throw new Error("raysSpin: duration(초)이 필요합니다");
  const n = normRays(rays), sgn = dir < 0 ? -1 : 1;
  if (mode === "beat") {
    if (!(beat > 0)) throw new Error("raysSpin: beat 모드에는 beat(초)가 필요합니다");
    const deg = (step === "swap" ? 360 : 720) / n;
    const k = step === "swap" ? 2 : 1; // 그림이 처음과 같아질 때까지 박 수
    const params = {};
    const f = Math.max(0.05, Math.min(1, snap)) / k;
    for (let i = 0; i < k; i++) {
      const p0 = (i / k) * 100, p1 = p0 + f * 100;
      params[`${+p0.toFixed(3)}%`] = { angle: r2(sgn * deg * i), easing };
      params[`${+p1.toFixed(3)}%`] = { angle: r2(sgn * deg * (i + 1)) };
    }
    params["100%"] = { angle: r2(sgn * deg * k) };
    const T = beat * k;
    return { type: "keyframes", options: { duration: us(T), delay: us(delay), easing: "linear", iterCount: Math.ceil((duration - delay) / T - 1e-9) }, params };
  }
  const T = Math.max(0.5, Number(period) || 10);
  return { type: "keyframes", options: { duration: us(T), delay: us(delay), easing: "linear", iterCount: Math.ceil((duration - delay) / T - 1e-9) },
    params: { "0%": { angle: 0 }, "100%": { angle: 360 * sgn } } };
}
