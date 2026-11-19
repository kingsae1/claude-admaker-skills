// 패턴 배경 — references/shots/pattern-drift.md
// 체커보드·그리드·도트·사선 줄무늬·동심원·지그재그를 브랜드 색 SVG 한 장으로 만들고, 위치 keyframes로 천천히 흐르게.
// SVG 이미지 + 기본 keyframes(+ iterCount)만 쓰므로 엔진·앱 공통(앱은 SVG를 불러올 때 PNG로 래스터화).
//
//   import { patternSvg, patternBox, patternDrift } from "./patterns.mjs";
//   import { svgUrl } from "./paper.mjs";
//   const p = { kind: "dots", size: 56, colors: ["#FFFFFF", "#2D5BFF"], weight: 18, angle: 20 };
//   const box = patternBox({ ...p, width: W, height: H });            // 화면보다 한 주기만큼 큰 상자
//   image("pat", svgUrl(patternSvg({ ...p, width: box.width, height: box.height })), a, b, box,
//     { animations: [patternDrift({ ...p, speed: 40, duration: b - a })] });
//
// 원리: 타일 하나를 SVG <pattern>으로 정의해 채운다. 한 주기(타일 한 칸)만큼 옮긴 그림은 처음과 같으므로,
// 한 주기를 이동하는 keyframes에 iterCount를 주면 주기 끝에서 처음으로 돌아가도 이음매가 보이지 않는다.
// SVG pattern: https://www.w3.org/TR/SVG2/pservers.html#Patterns

const r2 = (v) => Math.round(v * 100) / 100;
const us = (s) => Math.round(s * 1e6);
export const PATTERN_KINDS = ["checker", "grid", "dots", "stripes", "rings", "zigzag"];

// 굵기 기본값(size 비율)
const WEIGHT = { checker: 0, grid: 0.06, dots: 0.36, stripes: 0, rings: 0.22, zigzag: 0.12 };

/** size·weight 경계값: size ≥ 4px(모아레 방지), weight ≤ size/2 */
export function normPattern({ kind = "dots", size = 48, weight, angle } = {}) {
  if (!PATTERN_KINDS.includes(kind)) throw new Error(`patternSvg: kind는 ${PATTERN_KINDS.join("|")} 중 하나 (받은 값 ${kind})`);
  const s = Math.max(4, Number(size) || 48);
  const w0 = weight ?? s * WEIGHT[kind];
  const w = Math.max(0.5, Math.min(s / 2, Number(w0) || 1));
  const a = angle ?? (kind === "stripes" ? 45 : 0);
  return { kind, size: s, weight: w, angle: Number(a) || 0 };
}

/** 한 주기(px, 패턴 좌표): 이만큼 옮기면 그림이 처음과 같다. checker는 두 칸이 한 주기 */
export const patternPeriod = (kind, size) => (kind === "checker" ? 2 : 1) * Math.max(4, Number(size) || 48);

/** 화면보다 사방으로 한 주기 × √2(대각 흐름 xy까지) + 2px 큰 이미지 상자. drift 한 주기 동안 모서리가 비지 않는다 */
export function patternBox({ width, height, kind = "dots", size = 48 }) {
  const m = Math.ceil(patternPeriod(kind, size) * Math.SQRT2) + 2;
  return { x: -m, y: -m, width: width + 2 * m, height: height + 2 * m };
}

// 타일 내용 (패턴 좌표, 타일 P×P). 경계에 걸치는 획은 이웃 칸까지 그려 타일 가장자리에서 끊기지 않게.
function tile(kind, s, w, fg, bg) {
  const P = patternPeriod(kind, s);
  const bgRect = `<rect width="${r2(P)}" height="${r2(P)}" fill="${bg}"/>`;
  switch (kind) {
    case "checker":
      return { P, body: bgRect + `<rect width="${r2(s)}" height="${r2(s)}" fill="${fg}"/><rect x="${r2(s)}" y="${r2(s)}" width="${r2(s)}" height="${r2(s)}" fill="${fg}"/>` };
    case "grid": // 칸 경계에 weight 두께 선(가운데 정렬). 네 변에 반씩 그려 이웃 타일과 이어짐
      return { P, body: bgRect + `<rect x="0" y="0" width="${r2(P)}" height="${r2(w / 2)}" fill="${fg}"/><rect x="0" y="${r2(P - w / 2)}" width="${r2(P)}" height="${r2(w / 2)}" fill="${fg}"/>`
        + `<rect x="0" y="0" width="${r2(w / 2)}" height="${r2(P)}" fill="${fg}"/><rect x="${r2(P - w / 2)}" y="0" width="${r2(w / 2)}" height="${r2(P)}" fill="${fg}"/>` };
    case "dots": // 칸 중심 원, 지름 = weight
      return { P, body: bgRect + `<circle cx="${r2(P / 2)}" cy="${r2(P / 2)}" r="${r2(w / 2)}" fill="${fg}"/>` };
    case "stripes": // 세로 띠(폭 = size/2), angle만큼 돌림
      return { P, body: bgRect + `<rect x="0" y="0" width="${r2(P / 2)}" height="${r2(P)}" fill="${fg}"/>` };
    case "zigzag": { // 높이 size/2, 주기 size 꺾은선. 타일 밖(−½, +1½ 주기, 위아래 한 줄씩)까지 그려 꺾인 모서리가 잘리지 않게
      let lines = "";
      for (const dy of [-P, 0, P]) {
        const y0 = P * 0.75 + dy, y1 = P * 0.25 + dy;
        const pts = [[-P / 2, y1], [0, y0], [P / 2, y1], [P, y0], [1.5 * P, y1]].map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ");
        lines += `<polyline points="${pts}" fill="none" stroke="${fg}" stroke-width="${r2(w)}" stroke-linejoin="miter" stroke-miterlimit="10"/>`;
      }
      return { P, body: bgRect + lines };
    }
    default: return { P, body: bgRect };
  }
}

/**
 * 패턴 SVG 문자열(width × height). 보통 patternBox의 크기를 넘긴다.
 * @param {object} o
 * @param {"checker"|"grid"|"dots"|"stripes"|"rings"|"zigzag"} o.kind
 * @param {number} [o.size=48]    칸 크기(px). checker 한 칸, grid·dots 간격, stripes 주기(띠 폭 = size/2), rings 간격, zigzag 주기
 * @param {string[]} [o.colors]   [fg, bg]
 * @param {number} [o.weight]     선 두께·점 지름(px). 기본 grid 6%, dots 36%, rings 22%, zigzag 12% × size. 최대 size/2
 * @param {number} [o.angle]      패턴 회전(도). stripes 기본 45, 나머지 0
 * @param {number[]} [o.center]   rings 중심(이미지 비율 0–1)
 */
export function patternSvg({ kind = "dots", size = 48, colors = ["#FFFFFF", "#2D5BFF"], weight, angle, width, height, center = [0.5, 0.5] } = {}) {
  if (!(width > 0 && height > 0)) throw new Error("patternSvg: width, height가 필요합니다");
  const n = normPattern({ kind, size, weight, angle });
  const [fg, bg] = colors;
  const W = Math.round(width), H = Math.round(height);
  let defs = "", body;
  if (n.kind === "rings") {
    const cx = center[0] * W, cy = center[1] * H;
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - cx, y - cy)));
    let rings = "";
    for (let r = n.size; r <= far + n.size * 2; r += n.size) rings += `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}"/>`;
    body = `<rect width="${W}" height="${H}" fill="${bg}"/><circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(n.weight / 2)}" fill="${fg}"/><g fill="none" stroke="${fg}" stroke-width="${r2(n.weight)}">${rings}</g>`;
  } else {
    const { P, body: t } = tile(n.kind, n.size, n.weight, fg, bg);
    // 패턴 원점 = 이미지 가운데(회전해도 화면 가운데가 칸 모서리에 오도록)
    defs = `<pattern id="pt" patternUnits="userSpaceOnUse" width="${r2(P)}" height="${r2(P)}" patternTransform="translate(${r2(W / 2)} ${r2(H / 2)}) rotate(${r2(n.angle)})">${t}</pattern>`;
    body = `<rect width="${W}" height="${H}" fill="${bg}"/><rect width="${W}" height="${H}" fill="url(#pt)"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
}

/** 한 주기 이동 벡터(화면 px): 패턴 좌표의 격자 벡터를 angle만큼 돌린 것 */
export function driftVector({ kind = "dots", size = 48, angle, dir = "x" } = {}) {
  const n = normPattern({ kind, size, angle });
  const P = patternPeriod(n.kind, n.size);
  // stripes는 띠에 수직(x)으로만 움직여야 보인다. 나머지는 x, y, xy(대각) 중 선택
  const [ux, uy] = n.kind === "stripes" ? [1, 0] : dir === "y" ? [0, 1] : dir === "xy" ? [1, 1] : [1, 0];
  const a = (n.angle * Math.PI) / 180;
  return { dx: P * (ux * Math.cos(a) - uy * Math.sin(a)), dy: P * (ux * Math.sin(a) + uy * Math.cos(a)), P };
}

/**
 * 이음매 없는 흐름 keyframes(한 주기 + iterCount). 이미지 상자는 patternBox로.
 * @param {object} o
 * @param {string} o.kind
 * @param {number} o.size
 * @param {number} [o.angle]      patternSvg에 준 각도와 같게
 * @param {number} [o.speed=30]   px/초. 배경은 20–60이 "천천히 흐름", 박에 맞출 땐 period를 쓴다
 * @param {number} [o.period]     한 주기 초(주면 speed 무시). 박 길이·마디 길이로 맞추면 음악과 같이 흐름
 * @param {"x"|"y"|"xy"} [o.dir="x"] 흐르는 축(패턴 좌표). stripes는 항상 띠에 수직
 * @param {number} [o.sign=-1]    −1이면 패턴 좌표 −방향(왼쪽·위로 흐름), 1이면 반대
 * @param {number} o.duration     클립 길이(초) → iterCount
 * rings는 옮겨도 반복되지 않으므로 대신 한 주기 동안 한 간격만큼 커졌다 돌아오는 숨쉬기(scale)를 준다.
 */
export function patternDrift({ kind = "dots", size = 48, angle, speed = 30, period, dir = "x", sign = -1, duration, delay = 0, width = 1080, height = 1920 } = {}) {
  if (!(duration > 0)) throw new Error("patternDrift: duration(초)이 필요합니다");
  const n = normPattern({ kind, size, angle });
  if (n.kind === "rings") {
    const T = period > 0 ? period : Math.max(2, (n.size * 4) / Math.max(1, speed));
    const k = 1 + n.size / (Math.hypot(width, height) / 2);
    return { type: "keyframes", options: { duration: us(T), delay: us(delay), easing: "linear", iterCount: Math.ceil((duration - delay) / T - 1e-9) },
      params: { "0%": { scale: 1, easing: "easeInOutSine" }, "50%": { scale: +k.toFixed(4), easing: "easeInOutSine" }, "100%": { scale: 1 } } };
  }
  const { dx, dy } = driftVector({ ...n, dir });
  const dist = Math.hypot(dx, dy);
  const T = period > 0 ? period : dist / Math.max(1, Number(speed) || 30);
  const s = sign < 0 ? -1 : 1;
  return { type: "keyframes", options: { duration: us(T), delay: us(delay), easing: "linear", iterCount: Math.ceil((duration - delay) / T - 1e-9) },
    params: { "0%": { x: 0, y: 0 }, "100%": { x: +(s * dx).toFixed(3), y: +(s * dy).toFixed(3) } } };
}
