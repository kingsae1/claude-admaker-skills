// 영상 이펙트 39종 빌더 — references/video-effects.md (카탈로그)·references/effects/*.md (카드)
// 모두 엔진 기본 클립(Image·Video·Text·Shape·Transition)과 keyframes·마스크·트랙 매트·클립 효과만 씁니다.
// script 어댑터를 쓰지 않으므로 to-admaker-import.mjs → admaker 앱 "광고 불러오기"·MCP import_to_admaker로 그대로 넘어갑니다.
//
// 사용:
//   import * as fx from "./effects.mjs";
//   const out = fx.giantType({ from: 0, to: 3, text: "SALE", subject });   // → 클립 배열(아래→위 순서)
//   for (const c of out) add(c);                                             // 뒤에 넣을수록 위
//
// 공통 약속
// - 시간은 초(from·to·at). 클립 timing은 μs로 바꿔 넣습니다.
// - 반환값은 { id, type, timing, transform, … } 클립 배열이고, 배열 순서가 겹침 순서(앞 = 아래)입니다.
//   렌더 하니스는 tracks 앞쪽이 위이므로 samples/video-effects/build.mjs의 add()처럼 트랙을 앞에 끼워 넣습니다.
// - 소재는 "장면 스펙" { type: "Image"|"Video", src, trimFrom?, volume? } 으로 받습니다. 클립은 이 파일이 만듭니다.
// - 인물(subject)은 누끼 PNG({ src, box })입니다. 사진은 MCP ai.image.removeBackground / ai.image.separateLayers,
//   그린스크린 영상은 MCP chroma_key로 얻습니다. 프레임마다 움직이는 일반 영상의 누끼는 아직 도구가 없습니다(카탈로그 §한계).
// - 이미 있는 클립에 효과를 거는 함수(halftonePrint, comicImpact, glitch, rackFocus …)는 그 클립 객체를 고치고
//   추가 클립 배열을 돌려줍니다.
import { fontStyle } from "./fonts.mjs";
import { annotationPath, annotationBox, seededRandom } from "./draw.mjs";

// ───────────────────────────── 기본 도구
export const us = (s) => Math.round(s * 1e6);
export const tm = (a, b, extra = {}) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1, ...extra });
const r2 = (v) => Math.round(v * 100) / 100;

/** 초 단위 정지점 [[t, {키: 값}, 이징?]] → keyframes (클립 [from, to] 기준 %). 빠진 키는 앞 정지점 값을 이어 씁니다. */
export function keys(from, to, stops) {
  const d = Math.max(1e-6, to - from), params = {};
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  const all = new Set(sorted.flatMap(([, v]) => Object.keys(v)));
  const last = {};
  for (const [t, v, easing] of sorted) {
    Object.assign(last, v);
    const stop = {};
    for (const k of all) if (k in last) stop[k] = last[k];
    const pct = Math.min(100, Math.max(0, ((t - from) / d) * 100));
    params[`${+pct.toFixed(3)}%`] = { ...stop, ...(easing ? { easing } : {}) };
  }
  // 첫 정지점 전 값 = 첫 정지점 값(엔진은 0% 전에는 0% 값)
  for (const k of all) for (const p of Object.values(params)) if (!(k in p)) p[k] = defaultOf(k);
  return { type: "keyframes", options: { duration: us(d), delay: 0, easing: "linear" }, params };
}
const defaultOf = (k) => (["scale", "scaleX", "scaleY", "opacity", "brightness"].includes(k) ? 1 : 0);

export const svgUrl = (w, h, body, defs = "") =>
  "data:image/svg+xml;base64," + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`).toString("base64");

let SEQ = 0;
const nid = (p) => `${p}_${++SEQ}`;
/** 같은 빌드에서 id를 처음부터 다시 셀 때 */
export const resetIds = () => { SEQ = 0; };

const base = (prefix, type, from, to, transform, rest = {}) => ({
  id: rest.id ?? nid(prefix), name: rest.name ?? prefix, type, timing: tm(from, to, rest.timingExtra ?? {}),
  transform: { angle: 0, opacity: 1, ...transform }, animations: [], ...omit(rest, ["id", "name", "timingExtra"]),
});
const omit = (o, ks) => Object.fromEntries(Object.entries(o).filter(([k]) => !ks.includes(k)));

export const image = (prefix, src, from, to, box, rest = {}) => base(prefix, "Image", from, to, box, { src, ...rest });
export const shape = (prefix, shapeType, from, to, box, style, rest = {}) => base(prefix, "Shape", from, to, box, { src: "shape", shapeType, style, ...rest });
export const text = (prefix, str, from, to, box, style, rest = {}) => base(prefix, "Text", from, to, box, { text: str, style: { align: "center", verticalAlign: "center", ...style }, ...rest });

/** 장면 스펙 → Image/Video 클립. trimFrom(초)은 원본에서 쓰기 시작할 위치 */
export function scene(prefix, spec, from, to, box, rest = {}) {
  if (spec.type === "Video") {
    const rate = rest.playbackRate ?? spec.playbackRate ?? 1;
    const tf = spec.trimFrom ?? 0;
    const c = base(prefix, "Video", from, to, box, { src: spec.src, volume: spec.volume ?? 0, ...omit(rest, ["playbackRate"]),
      timingExtra: { playbackRate: rate, trim: { from: us(tf), to: us(tf + (to - from) * rate) } } });
    return c;
  }
  return image(prefix, spec.src, from, to, box, rest);
}

export const FONT = {
  display: () => fontStyle({ name: "Black Han Sans" }),
  bold: () => fontStyle({ name: "Noto Sans KR", weight: 700 }),
  body: () => fontStyle({ name: "Noto Sans KR", weight: 400 }),
  mono: () => fontStyle({ name: "Space Mono", weight: 700 }),
  hand: () => fontStyle({ name: "Nanum Pen Script" }),
};
const f = (tok) => { const { _weight, ...s } = typeof tok === "function" ? tok() : tok; return s; };

const full = (W, H) => ({ x: 0, y: 0, width: W, height: H });
const boxAt = (cx, cy, w, h) => ({ x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), width: Math.round(w), height: Math.round(h) });
const centerOf = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
/** scale k로 키울 때 점 P를 제자리에 두는 x·y 오프셋 (scale은 박스 가운데 기준) */
export const zoomAt = (P, box, k, extra = {}) => { const c = centerOf(box); return { scale: k, x: r2(-(P.x - c.x) * (k - 1)), y: r2(-(P.y - c.y) * (k - 1)), ...extra }; };
/** 인물 클립(누끼 PNG). subject = { src, box } */
const subjectClip = (subject, from, to, rest = {}) => image("subject", subject.src, from, to, subject.box, rest);
/** 소재를 박스에 cover로 맞춘 상자 (원본 비율 aw:ah) */
export function coverBox(panel, aw, ah) {
  const s = Math.max(panel.width / aw, panel.height / ah);
  return boxAt(panel.x + panel.width / 2, panel.y + panel.height / 2, aw * s, ah * s);
}
const pop = (from, to, at, { dur = 0.35, overshoot = 1.08, fromScale = 0.4 } = {}) => keys(from, to, [
  [from, { scale: fromScale, opacity: 0 }], [at, { scale: fromScale, opacity: 0 }, "easeOutBack"],
  [at + dur * 0.7, { scale: overshoot, opacity: 1 }, "easeOutQuad"], [at + dur, { scale: 1, opacity: 1 }], [to, {}],
]);
/** 클립 끝에 짧은 퇴장(opacity) */
const fadeTail = (stops, to, dur = 0.25) => [...stops, [to - dur, {}], [to, { opacity: 0 }]];

// ═════════════════════════════ 1. 인물 뒤 공간 (7) — 배경 → 효과 → 인물 누끼 순서로 쌓음

/** 시계 다이얼: 인물 뒤 큰 시계 문자판이 나타나고 바늘이 빠르게 돎(타임랩스·마감 임박). */
export function clockDial({ from, to, W = 1080, H = 1920, subject, center = { x: W / 2, y: H * 0.42 }, radius = W * 0.46, color = "#FFFFFF", accent = "#FF4D4D", turns = 3 }) {
  const R = Math.round(radius), S = R * 2, box = boxAt(center.x, center.y, S, S);
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0, r1 = R * (big ? 0.80 : 0.86), r0 = R * 0.92;
    return `<line x1="${R + Math.sin(a) * r1}" y1="${R - Math.cos(a) * r1}" x2="${R + Math.sin(a) * r0}" y2="${R - Math.cos(a) * r0}" stroke="${color}" stroke-width="${big ? 10 : 4}" stroke-linecap="round" opacity="${big ? 0.95 : 0.6}"/>`;
  }).join("");
  const dial = svgUrl(S, S, `<circle cx="${R}" cy="${R}" r="${R * 0.97}" fill="none" stroke="${color}" stroke-width="${R * 0.035}" opacity="0.9"/>
<circle cx="${R}" cy="${R}" r="${R * 0.7}" fill="none" stroke="${color}" stroke-width="2" opacity="0.35" stroke-dasharray="6 14"/>${ticks}`);
  const hand = (len, w, c) => svgUrl(S, S, `<rect x="${R - w / 2}" y="${R - len}" width="${w}" height="${len + R * 0.08}" rx="${w / 2}" fill="${c}"/><circle cx="${R}" cy="${R}" r="${w * 1.2}" fill="${c}"/>`);
  const enter = (extra = {}) => [[from, { scale: 0.7, opacity: 0, angle: -30, ...extra }], [from + 0.6, { scale: 1, opacity: 1, angle: 0 }, "easeOutCubic"]];
  return [
    image("clock_dial", dial, from, to, box, { animations: [keys(from, to, fadeTail([...enter(), [to, { angle: 8 }]], to))] }),
    image("clock_hour", hand(R * 0.5, R * 0.05, color), from, to, box, { animations: [keys(from, to, fadeTail([[from, { opacity: 0, angle: 0 }], [from + 0.6, { opacity: 1, angle: 30 }, "easeInOutSine"], [to, { angle: 30 + 360 * turns / 12 }]], to))] }),
    image("clock_minute", hand(R * 0.78, R * 0.03, accent), from, to, box, { animations: [keys(from, to, fadeTail([[from, { opacity: 0, angle: 0 }], [from + 0.6, { opacity: 1, angle: 90 }, "easeInOutSine"], [to, { angle: 90 + 360 * turns }]], to))] }),
    ...(subject ? [subjectClip(subject, from, to)] : []),
  ];
}

/** 거대 글자: 인물 뒤에 화면보다 큰 글자가 깔리며 천천히 흐름. */
export function giantType({ from, to, W = 1080, H = 1920, subject, text: str, y = H * 0.2, size = W * 0.42, color = "#FFFFFF", font = FONT.display, drift = -120 }) {
  const box = { x: -W * 0.5, y: Math.round(y), width: W * 2, height: Math.round(size * 1.15) };
  return [
    text("giant", str, from, to, box, { ...f(font), fontSize: Math.round(size), color, letterSpacing: -4 }, {
      animations: [keys(from, to, fadeTail([[from, { scale: 1.35, opacity: 0, blur: 16, x: 0 }], [from + 0.5, { scale: 1, opacity: 1, blur: 0, x: 0 }, "easeOutExpo"], [to, { x: drift }]], to))] }),
    ...(subject ? [subjectClip(subject, from, to)] : []),
  ];
}

/** 게시물 벽: 인물 뒤로 SNS 게시물 카드가 격자로 깔려 위로 흘러감(입소문·후기 많음). */
export function postWall({ from, to, W = 1080, H = 1920, subject, cols = 3, palette = ["#FFB4A2", "#B5E2FA", "#F9F7F3", "#FDE2E4", "#CDEAC0", "#FFD6A5"], speed = 260, tilt = 14, seed = 3 }) {
  const gap = 24, cw = (W - gap * (cols + 1)) / cols, ch = cw * 1.25;
  const rows = Math.ceil((H + speed * (to - from) + ch) / (ch + gap)) + 1, WH = rows * (ch + gap) + gap;
  const rnd = seededRandom(seed);
  let body = `<rect width="${W}" height="${WH}" fill="#111"/>`;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = gap + c * (cw + gap), y = gap + r * (ch + gap) + (c % 2) * ch * 0.35, col = palette[Math.floor(rnd() * palette.length)];
    body += `<g transform="translate(${x} ${y})"><rect width="${cw}" height="${ch}" rx="22" fill="#fff"/>
<circle cx="34" cy="34" r="18" fill="${palette[(r + c) % palette.length]}"/><rect x="62" y="24" width="${cw * 0.4}" height="10" rx="5" fill="#ccc"/><rect x="62" y="40" width="${cw * 0.25}" height="8" rx="4" fill="#e3e3e3"/>
<rect x="14" y="66" width="${cw - 28}" height="${ch * 0.62}" rx="14" fill="${col}"/>
<path d="M${24} ${ch - 34} c0 -10 14 -14 18 -4 c4 -10 18 -6 18 4 c0 12 -18 20 -18 20 s-18 -8 -18 -20z" fill="#FF3B5C"/>
<rect x="68" y="${ch - 36}" width="${cw * 0.3}" height="10" rx="5" fill="#ddd"/></g>`;
  }
  const box = { x: 0, y: -Math.round(ch), width: W, height: Math.round(WH) };
  return [
    image("post_wall", svgUrl(W, Math.round(WH), body), from, to, box, { transform3d: { rotateX: tilt, perspective: 1600 },
      animations: [keys(from, to, fadeTail([[from, { y: 0, opacity: 0 }], [from + 0.4, { opacity: 1 }], [to, { y: -Math.round(speed * (to - from)) }]], to))] }),
    image("post_wall_shade", svgUrl(W, H, `<rect width="${W}" height="${H}" fill="url(#g)"/>`, `<radialGradient id="g" cx="0.5" cy="0.45" r="0.7"><stop offset="0.3" stop-color="#000" stop-opacity="0.15"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient>`), from, to, full(W, H)),
    ...(subject ? [subjectClip(subject, from, to)] : []),
  ];
}

/** 궤도 링: 인물 몸통을 타원 궤도가 감싸고 라벨·아이콘이 앞뒤로 돎. 앞 반은 인물 위, 뒤 반은 인물 아래에 그림. */
export function orbitRing({ from, to, W = 1080, H = 1920, subject, center = { x: W / 2, y: H * 0.55 }, rx = W * 0.44, ry = W * 0.1, items = ["NEW", "★ 4.9", "무료배송", "1+1"], color = "#FFFFFF", accent = "#7C5CFF", font = FONT.bold, turns = 1.2, tilt = -8 }) {
  const PW = Math.round(rx * 2 + 40), PH = Math.round(ry * 2 + 40), box = boxAt(center.x, center.y, PW, PH);
  const arc = (front) => svgUrl(PW, PH, `<path d="M ${20} ${PH / 2} A ${rx} ${ry} 0 0 ${front ? 0 : 1} ${PW - 20} ${PH / 2}" fill="none" stroke="${color}" stroke-width="${front ? 8 : 5}" opacity="${front ? 0.95 : 0.55}" stroke-linecap="round"/>`);
  const ring = (front) => image(front ? "orbit_front" : "orbit_back", arc(front), from, to, box, { angle: tilt,
    animations: [keys(from, to, fadeTail([[from, { scaleX: 0.2, opacity: 0 }], [from + 0.5, { scaleX: 1, opacity: 1 }, "easeOutCubic"], [to, {}]], to))] });
  const rad = (tilt * Math.PI) / 180, steps = Math.max(24, Math.round(36 * turns));
  const chips = (front) => items.map((label, i) => {
    const cw = Math.max(150, label.length * 34 + 60), chH = 72;
    const stops = [];
    for (let s = 0; s <= steps; s++) {
      const t = from + ((to - from) * s) / steps, th = (i / items.length) * Math.PI * 2 + (s / steps) * Math.PI * 2 * turns;
      const ex = Math.cos(th) * rx, ey = Math.sin(th) * ry, depth = Math.sin(th); // depth>0 = 앞
      const x = ex * Math.cos(rad) - ey * Math.sin(rad), y = ex * Math.sin(rad) + ey * Math.cos(rad);
      const vis = front ? depth >= 0 : depth < 0;
      stops.push([t, { x: r2(x), y: r2(y), scale: r2(0.78 + 0.22 * (depth + 1) / 2), opacity: vis ? (s === 0 ? 0 : 1) : 0 }]);
    }
    const b = boxAt(center.x, center.y, cw, chH);
    return [
      shape(`orbit_chip${front ? "F" : "B"}`, "pill", from, to, b, { fill: front ? accent : "#3B2F7A" }, { animations: [keys(from, to, stops)] }),
      text(`orbit_label${front ? "F" : "B"}`, label, from, to, b, { ...f(font), fontSize: 36, color: "#FFFFFF" }, { animations: [keys(from, to, stops)] }),
    ];
  }).flat();
  return [ring(false), ...chips(false), ...(subject ? [subjectClip(subject, from, to)] : []), ring(true), ...chips(true)];
}

/** 숫자 카운트: 인물 뒤 큰 숫자가 0에서 목표값까지 올라감. countUp은 글자 안 첫 숫자를 셉니다. */
export function countUpBehind({ from, to, W = 1080, H = 1920, subject, value = 10000, prefix = "", suffix = "+", label = "누적 판매", y = H * 0.16, size = W * 0.24, color = "#FFFFFF", accent = "#FFD23F", font = FONT.display, countDur = 1.6 }) {
  const str = `${prefix}${value.toLocaleString("en-US")}${suffix}`;
  const box = { x: -W * 0.25, y: Math.round(y), width: W * 1.5, height: Math.round(size * 1.2) };
  return [
    text("count_label", label, from, to, { x: 0, y: Math.round(y - 90), width: W, height: 90 }, { ...f(FONT.bold), fontSize: 56, color: accent }, {
      animations: [keys(from, to, fadeTail([[from, { y: 30, opacity: 0 }], [from + 0.4, { y: 0, opacity: 1 }, "easeOutCubic"], [to, {}]], to))] }),
    text("count_num", str, from, to, box, { ...f(font), fontSize: Math.round(size), color }, {
      animations: [
        { type: "countUp", options: { duration: us(countDur), delay: us(0.2), easing: "easeOutExpo" }, params: { from: 0, to: value, separator: "," } },
        keys(from, to, fadeTail([[from, { scale: 0.85, opacity: 0 }], [from + 0.3, { scale: 1, opacity: 1 }, "easeOutCubic"], [from + 0.2 + countDur, { scale: 1 }, "easeOutCubic"], [from + 0.35 + countDur, { scale: 1.08 }], [from + 0.6 + countDur, { scale: 1 }], [to, {}]], to)),
      ] }),
    ...(subject ? [subjectClip(subject, from, to)] : []),
  ];
}

/** 차트 상승: 인물 뒤 막대가 차례로 솟고 상승 화살표가 그려짐. */
export function chartRise({ from, to, W = 1080, H = 1920, subject, values = [0.25, 0.4, 0.55, 0.78, 1], area = { x: 80, y: H * 0.12, width: W - 160, height: H * 0.5 }, color = "#2EE6A6", line = "#FFFFFF", stagger = 0.12 }) {
  const n = values.length, gap = 26, bw = (area.width - gap * (n - 1)) / n, out = [];
  values.forEach((v, i) => {
    const h = Math.round(area.height * v), b = { x: Math.round(area.x + i * (bw + gap)), y: Math.round(area.y + area.height - h), width: Math.round(bw), height: h };
    const at = from + 0.2 + i * stagger;
    out.push(shape("chart_bar", "rounded", from, to, b, { fill: color, fillOpacity: 0.35 + 0.65 * (i / (n - 1 || 1)), borderRadius: 18 }, {
      animations: [keys(from, to, fadeTail([[from, { height: -h, y: h }], [at, { height: -h, y: h }, "easeOutExpo"], [at + 0.6, { height: 0, y: 0 }], [to, {}]], to))] }));
  });
  // 막대 꼭대기를 잇는 화살표(path, strokeDraw)
  const pts = values.map((v, i) => [area.x + i * (bw + gap) + bw / 2, area.y + area.height - area.height * v - 50]);
  const [lx, ly] = pts[pts.length - 1], [px, py] = pts[pts.length - 2];
  const ang = Math.atan2(ly - py, lx - px), ah = 46;
  const d = `M${pts.map((p) => p.map(r2).join(" ")).join(" L")} M${r2(lx - ah * Math.cos(ang - 0.5))} ${r2(ly - ah * Math.sin(ang - 0.5))} L${r2(lx)} ${r2(ly)} L${r2(lx - ah * Math.cos(ang + 0.5))} ${r2(ly - ah * Math.sin(ang + 0.5))}`;
  const lineAt = from + 0.2 + n * stagger + 0.3;
  out.push(shape("chart_arrow", "path", lineAt, to, full(W, H), { path: d, viewBox: [0, 0, W, H], fill: "transparent", fillOpacity: 0, stroke: { color: line, width: 14, cap: "round", join: "round" } }, {
    animations: [{ type: "strokeDraw", options: { duration: us(0.7), easing: "easeInOutCubic" }, params: { fill: "none" } }] }));
  if (subject) out.push(subjectClip(subject, from, to));
  return out;
}

/** 무한 터널: 인물 뒤로 사각 링이 끝없이 다가옴(빨려 들어가는 공간). 링마다 지수 확대 + 비틀림. */
export function infiniteTunnel({ from, to, W = 1080, H = 1920, subject, count = 9, period = 2.4, colors = ["#7C5CFF", "#FF4FD8", "#2EE6FF"], twist = 18, center = { x: W / 2, y: H * 0.45 } }) {
  const out = [], b = boxAt(center.x, center.y, W * 0.9, H * 0.6), kMin = 0.04, kMax = 3.2;
  for (let i = 0; i < count; i++) {
    const phase = i / count, stops = [];
    // 링 하나가 period 동안 kMin→kMax로 지수 확대, 끝나면 다시 작게(투명할 때 되돌림)
    const sample = 8;
    for (let t0 = from - phase * period; t0 < to; t0 += period) {
      for (let s = 0; s <= sample; s++) {
        const u = s / sample, t = t0 + u * period;
        if (t < from - 1e-6 || t > to + 1e-6) continue;
        const k = kMin * Math.pow(kMax / kMin, u);
        stops.push([t, { scale: r2(k * 1000) / 1000, angle: r2(twist * u + i * 4), opacity: r2(Math.min(1, u * 5) * Math.min(1, (1 - u) * 4)) }]);
      }
    }
    if (!stops.length || stops[0][0] > from + 1e-6) stops.unshift([from, { scale: kMin, opacity: 0, angle: 0 }]);
    out.push(shape("tunnel_ring", "rounded", from, to, b, { fill: "transparent", fillOpacity: 0, borderRadius: 40, stroke: { color: colors[i % colors.length], width: 10 } }, { animations: [keys(from, to, stops)] }));
  }
  if (subject) out.push(subjectClip(subject, from, to));
  return out;
}

// ═════════════════════════════ 2. 인물 변형 (11) — 누끼 PNG 기준

/** 분신 줄세우기: 같은 인물이 양옆으로 줄지어 나타남(뒤로 갈수록 작고 옅게). */
export function cloneLineup({ from, to, W = 1080, subject, count = 4, spacing = W * 0.2, stagger = 0.12 }) {
  const out = [], { box } = subject;
  // 먼 분신부터(아래) → 가까운 분신 → 본체(위)
  for (let k = count; k >= 1; k--) for (const side of [-1, 1]) {
    const at = from + 0.15 + (k - 1) * stagger, dx = side * spacing * k, s = 1 - 0.12 * k;
    out.push(image("clone", subject.src, from, to, box, { animations: [keys(from, to, fadeTail([[from, { x: 0, scale: s, opacity: 0 }], [at, { x: 0, scale: s, opacity: 0 }, "easeOutBack"], [at + 0.45, { x: dx, y: -40 * k * (1 - s), scale: s, opacity: 1 - 0.15 * k }], [to, {}]], to))] }));
  }
  out.push(subjectClip(subject, from, to));
  return out;
}

/** 머리 쌓기: 인물 머리만 오려 위로 탑처럼 쌓아 올림. head = 누끼 PNG 안 머리 원 {cx, cy, r}(캔버스 좌표). */
export function headStack({ from, to, subject, head, count = 4, stagger = 0.18, squash = 0.92 }) {
  const out = [subjectClip(subject, from, to)], { box } = subject, step = head.r * 2 * squash;
  for (let i = 1; i <= count; i++) {
    const at = from + 0.2 + (i - 1) * stagger, dy = -step * i, drop = -400;
    const stops = fadeTail([[from, { y: dy + drop, opacity: 0, angle: 0 }], [at, { y: dy + drop, opacity: 0, angle: (i % 2 ? 1 : -1) * 6 }, "easeOutBounce"], [at + 0.5, { y: dy, opacity: 1, angle: (i % 2 ? -1 : 1) * 3 }], [to, {}]], to);
    const matte = shape("head_matte", "circle", from, to, boxAt(head.cx, head.cy, head.r * 2, head.r * 2), { fill: "#FFFFFF" }, { animations: [keys(from, to, stops)] });
    out.push(matte, image("head_copy", subject.src, from, to, box, { style: { matte: { clipId: matte.id, mode: "alpha", feather: 2 } }, animations: [keys(from, to, stops)] }));
  }
  return out;
}

const codeLines = (n, seed = 1) => {
  const r = seededRandom(seed), w = ["const", "let", "=>", "return", "await", "fn", "if", "ad.render()", "0x1F", "{ }", "[]", "true", "null", "=== ", "map(", "brand", "push", "async", "// TODO", "export"];
  return Array.from({ length: n }, () => Array.from({ length: 4 + Math.floor(r() * 5) }, () => w[Math.floor(r() * w.length)]).join(" ")).join("\n");
};

/** 코드 인간: 인물 실루엣 안에서만 코드 글자가 흘러내림(트랙 매트 alpha). 원본 인물 → 코드로 바뀜. */
export function codeHuman({ from, to, W = 1080, H = 1920, subject, color = "#3BFF7A", font = FONT.mono, size = 34, swapAt = from + 0.5, chars }) {
  const lineH = size * 1.25, rows = Math.ceil((H * 2) / lineH);
  const matte = subjectClip(subject, from, to, { name: "code_matte" });
  const body = chars ?? codeLines(rows, 7);
  return [
    subjectClip(subject, from, to, { animations: [keys(from, to, [[from, { opacity: 1 }], [swapAt, { opacity: 1 }], [swapAt + 0.4, { opacity: 0.12, brightness: 0.4 }], [to, {}]])] }),
    matte,
    text("code_rain", body, from, to, { x: 0, y: -H, width: W, height: H * 2 }, { ...f(font), fontSize: size, color, align: "left", verticalAlign: "top", lineHeight: 1.25, matte: { clipId: matte.id, mode: "alpha" } }, {
      animations: [keys(from, to, [[from, { y: 0, opacity: 0 }], [swapAt, { opacity: 0 }], [swapAt + 0.4, { opacity: 1 }], [to, { y: Math.round(H * 0.6) }]])] }),
  ];
}

/** 아스키 인간: 인물 실루엣을 아스키 문자 격자로. 문자 위에 원본을 multiply로 얹어 명암을 살림. */
export function asciiHuman({ from, to, W = 1080, H = 1920, subject, color = "#E8E8E8", size = 30, swapAt = from + 0.5, ramp = "@%#*+=-:. ", seed = 4 }) {
  const cols = Math.ceil(W / (size * 0.6)), rows = Math.ceil(H / size), rnd = seededRandom(seed);
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ramp[Math.floor(rnd() * (ramp.length - 1))]).join("")).join("\n");
  const matte = subjectClip(subject, from, to, { name: "ascii_matte" });
  const flicker = []; for (let t = swapAt; t < to; t += 0.25) flicker.push([t, { opacity: 0.85 + 0.15 * ((Math.round(t * 4) % 2)) }]);
  return [
    subjectClip(subject, from, to, { animations: [keys(from, to, [[from, { opacity: 1 }], [swapAt, {}], [swapAt + 0.3, { opacity: 0 }], [to, {}]])] }),
    matte,
    text("ascii", grid, from, to, full(W, H), { ...f(FONT.mono), fontSize: size, color, align: "left", verticalAlign: "top", lineHeight: 1, matte: { clipId: matte.id, mode: "alpha" } }, {
      animations: [keys(from, to, [[from, { opacity: 0 }], [swapAt, { opacity: 0 }], [swapAt + 0.3, { opacity: 1 }], ...flicker, [to, {}]])] }),
    subjectClip(subject, from, to, { name: "ascii_shade", style: { blendMode: "multiply" }, animations: [keys(from, to, [[from, { opacity: 0 }], [swapAt, { opacity: 0 }], [swapAt + 0.3, { opacity: 0.55 }], [to, {}]])] }),
  ];
}

/**
 * 누끼 PNG 둘레에 외곽선을 그린 SVG (feMorphology dilate − 원본). src는 data URL이어야 SVG 안에서 읽힙니다
 * (SVG를 이미지로 그릴 때 바깥 URL은 막힘). 앱으로 넘기면 앱이 PNG로 래스터화합니다.
 */
export function outlineSvg({ src, w, h, width = 10, color = "#FFFFFF", glow = 0, keepSubject = false, shadow = false }) {
  const defs = `<filter id="o" x="-20%" y="-20%" width="140%" height="140%">
<feMorphology in="SourceAlpha" operator="dilate" radius="${width}" result="d"/>
${keepSubject ? `<feFlood flood-color="${color}"/><feComposite in2="d" operator="in" result="ring"/>` : `<feComposite in="d" in2="SourceAlpha" operator="out" result="edge"/><feFlood flood-color="${color}"/><feComposite in2="edge" operator="in" result="ring"/>`}
${glow ? `<feGaussianBlur in="ring" stdDeviation="${glow}" result="g"/>` : ""}
${shadow ? `<feDropShadow in="ring" dx="0" dy="${width}" stdDeviation="${width}" flood-opacity="0.35" result="ring2"/>` : ""}
<feMerge>${glow ? `<feMergeNode in="g"/><feMergeNode in="g"/>` : ""}<feMergeNode in="${shadow ? "ring2" : "ring"}"/>${keepSubject ? `<feMergeNode in="SourceGraphic"/>` : ""}</feMerge></filter>`;
  return svgUrl(w, h, `<image href="${src}" xlink:href="${src}" x="0" y="0" width="${w}" height="${h}" filter="url(#o)"/>`, defs);
}

/** 네온 윤곽선: 화면이 어두워지고 인물 둘레에 네온관이 깜빡이며 켜짐. */
export function neonOutline({ from, to, subject, color = "#FF2BD6", color2 = "#22E1FF", width = 8 }) {
  const { box } = subject, pad = 60, b2 = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  const inner = svgUrl(b2.width, b2.height, `<image href="${subject.src}" xlink:href="${subject.src}" x="${pad}" y="${pad}" width="${box.width}" height="${box.height}"/>`);
  const ring = (c, wdt, glow) => outlineSvg({ src: inner, w: b2.width, h: b2.height, width: wdt, color: c, glow });
  const flick = (at) => [[from, { opacity: 0 }], [at, { opacity: 0 }], [at + 0.05, { opacity: 1 }], [at + 0.1, { opacity: 0.2 }], [at + 0.16, { opacity: 1 }], [at + 0.24, { opacity: 0.4 }], [at + 0.3, { opacity: 1 }]];
  return [
    subjectClip(subject, from, to, { animations: [keys(from, to, [[from, { brightness: 1 }], [from + 0.3, { brightness: 0.35 }, "easeOutCubic"], [to, {}]])] }),
    image("neon_outer", ring(color2, width * 3, 10), from, to, b2, { animations: [keys(from, to, [...flick(from + 0.5), [to, {}]])] }),
    image("neon_inner", ring(color, width, 6), from, to, b2, { animations: [keys(from, to, [...flick(from + 0.35), ...Array.from({ length: Math.max(0, Math.floor((to - from - 1) / 0.5)) }, (_, i) => [from + 1 + i * 0.5, { opacity: i % 2 ? 1 : 0.82 }]), [to, {}]])] }),
  ];
}

/** 스티커 팝: 인물이 흰 테두리 스티커가 되어 통통 튀어나옴. */
export function stickerPop({ from, to, subject, at = from + 0.1, border = 16, angle = -6 }) {
  const { box } = subject, pad = border * 3, b2 = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  const inner = svgUrl(b2.width, b2.height, `<image href="${subject.src}" xlink:href="${subject.src}" x="${pad}" y="${pad}" width="${box.width}" height="${box.height}"/>`);
  const sticker = outlineSvg({ src: inner, w: b2.width, h: b2.height, width: border, color: "#FFFFFF", keepSubject: true, shadow: true });
  return [image("sticker", sticker, from, to, b2, { animations: [keys(from, to, [[from, { scale: 0.2, opacity: 0, angle: angle - 20 }], [at, { scale: 0.2, opacity: 0, angle: angle - 20 }, "easeOutBack"], [at + 0.35, { scale: 1.1, opacity: 1, angle: angle + 3 }, "easeOutQuad"], [at + 0.55, { scale: 1, angle }], [to, { angle: angle - 2, scale: 1.03 }]])] })];
}

/** 망점 인쇄: 클립에 dotFilter를 걸고 종이 질감(multiply)을 얹음. target = 고칠 클립. */
export function halftonePrint({ target, from, to, W = 1080, H = 1920, scale = 4, angle = 5, grayscale = false, paper = "#F3EBDD" }) {
  const lf = us(from) - target.timing.display.from;
  target.effects = [...(target.effects ?? []), { id: nid("fx_dot"), key: "dotFilter", startTime: lf, duration: us(to - from), values: { scale, angle, grayscale } }];
  const rnd = seededRandom(9);
  const grain = Array.from({ length: 500 }, () => `<circle cx="${r2(rnd() * W)}" cy="${r2(rnd() * H)}" r="${r2(0.6 + rnd() * 1.6)}" fill="#5a4a32" opacity="${r2(0.08 + rnd() * 0.12)}"/>`).join("");
  return [image("paper", svgUrl(W, H, `<rect width="${W}" height="${H}" fill="${paper}"/>${grain}`), from, to, full(W, H), { style: { blendMode: "multiply" } })];
}

/** 지폐 초상: 인물을 초록 단색 판화로 바꾸고 문양 테두리·액면가를 얹음. 진짜 판화 결은 img2img(ai.image.edit) 정지 컷이 낫습니다. */
export function banknotePortrait({ from, to, W = 1080, H = 1920, subject, ink = "#1F4D3A", paper = "#E9E4C9", value = "10000", title = "BANK OF ADMAKER", seed = 2 }) {
  const NW = W - 80, NH = Math.round(NW * 0.5), box = boxAt(W / 2, H * 0.45, NW, NH);
  const rnd = seededRandom(seed);
  let guil = "";
  for (let k = 0; k < 14; k++) {
    const a = 20 + k * 2.2, ph = rnd() * Math.PI;
    let d = "";
    for (let x = 0; x <= NW; x += 8) d += `${x ? "L" : "M"}${x} ${r2(NH - 34 + Math.sin(x / a + ph) * 14)}`;
    guil += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1" opacity="0.5"/>`;
    guil += `<path d="${d.replace(/ (\d+(\.\d+)?)/g, (m, y) => " " + r2(NH - Number(y)))}" fill="none" stroke="${ink}" stroke-width="1" opacity="0.5"/>`;
  }
  const lines = Array.from({ length: Math.ceil(NH / 5) }, (_, i) => `<line x1="0" y1="${i * 5}" x2="${NW}" y2="${i * 5}" stroke="${paper}" stroke-width="1.6"/>`).join("");
  const pw = NH * 0.78, ph2 = NH * 0.86, px = NW * 0.62 - pw / 2, py = (NH - ph2) / 2;
  const note = svgUrl(NW, NH, `<rect width="${NW}" height="${NH}" rx="18" fill="${paper}"/>
<rect x="14" y="14" width="${NW - 28}" height="${NH - 28}" rx="12" fill="none" stroke="${ink}" stroke-width="6"/>
<rect x="26" y="26" width="${NW - 52}" height="${NH - 52}" rx="8" fill="none" stroke="${ink}" stroke-width="1.5" stroke-dasharray="2 4"/>${guil}
<ellipse cx="${px + pw / 2}" cy="${NH / 2}" rx="${pw / 2 + 16}" ry="${ph2 / 2 + 6}" fill="${paper}" stroke="${ink}" stroke-width="3"/>
<g clip-path="url(#c)"><image href="${subject.src}" xlink:href="${subject.src}" x="${px}" y="${py}" width="${pw}" height="${ph2}" preserveAspectRatio="xMidYMid meet" filter="url(#ink)"/>${lines}</g>
<text x="60" y="110" font-family="serif" font-weight="700" font-size="40" fill="${ink}" letter-spacing="4">${title}</text>
<text x="60" y="${NH - 70}" font-family="serif" font-weight="700" font-size="110" fill="${ink}">${value}</text>
<text x="${NW - 60}" y="110" font-family="serif" font-weight="700" font-size="60" fill="${ink}" text-anchor="end">${value}</text>`,
  `<clipPath id="c"><ellipse cx="${px + pw / 2}" cy="${NH / 2}" rx="${pw / 2 + 10}" ry="${ph2 / 2}"/></clipPath>
<filter id="ink"><feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="discrete" tableValues="0.12 0.4 0.75 0.91"/><feFuncG type="discrete" tableValues="0.3 0.55 0.82 0.89"/><feFuncB type="discrete" tableValues="0.23 0.45 0.7 0.79"/></feComponentTransfer></filter>`);
  return [
    ...(subject.keep ? [subjectClip(subject, from, to, { animations: [keys(from, to, [[from, { opacity: 1 }], [from + 0.4, { opacity: 0 }]])] })] : []),
    image("banknote", note, from, to, box, { animations: [keys(from, to, [[from, { scale: 0.3, opacity: 0, angle: -25, rotateY: -60 }], [from + 0.6, { scale: 1, opacity: 1, angle: -4, rotateY: 0 }, "easeOutBack"], [to, { angle: -2, scale: 1.04 }]])] }),
  ];
}

/**
 * 컬러 분리: 소재의 R·G·B 채널이 어긋났다 다시 합침. rgbSplitFilter를 짧은 구간마다 다른 오프셋으로 이어 붙여 움직임을 냅니다
 * (클립 효과는 한 시각에 하나만 걸리고 values는 고정이라 구간을 나눔). target = 고칠 클립.
 */
export function colorSplit({ target, at, dur = 1.2, offset = 28, steps = 8 }) {
  const lf = us(at) - target.timing.display.from, seg = us(dur / steps), fx2 = [];
  for (let i = 0; i < steps; i++) {
    const u = i / (steps - 1), k = r2(Math.sin(u * Math.PI) * (i % 2 ? 0.6 : 1)) * offset;
    fx2.push({ id: nid("fx_split"), key: "rgbSplitFilter", startTime: lf + i * seg, duration: seg, values: { red: { x: -k, y: 0 }, green: { x: 0, y: r2(k * 0.5) }, blue: { x: k, y: 0 } } });
  }
  target.effects = [...(target.effects ?? []), ...fx2];
  return [];
}

/**
 * 잔상 트레일: 같은 소재를 몇 프레임씩 늦게 반투명으로 겹침. 원본을 먼저 깔고 지난 시점 복사본을 그 **위에** screen으로 얹습니다
 * (원본이 화면을 꽉 채우는 영상이라 아래에 두면 가려짐). 영상이면 trim을 앞당기고, 움직이는 클립이면 시작을 늦춥니다.
 */
export function echoTrail({ from, to, spec, box, count = 4, lag = 0.1, fade = 0.6, tint, blend = "screen" }) {
  const main = scene("echo_main", spec, from, to, box);
  if (spec.animations) main.animations = structuredClone(spec.animations);
  const out = [main];
  for (let i = 1; i <= count; i++) {
    const c = spec.type === "Video"
      ? scene("echo", { ...spec, trimFrom: Math.max(0, (spec.trimFrom ?? 0) - lag * i) }, from, to, box, { style: { blendMode: blend } })
      : scene("echo", spec, from + lag * i, to + lag * i, box, { style: { blendMode: blend } }); // 같은 길이로 늦춤(keyframes %가 그대로)
    c.transform.opacity = r2(Math.pow(fade, i));
    if (spec.animations) c.animations = structuredClone(spec.animations);
    if (tint) c.effects = [{ id: nid("fx_tint"), key: "colorOverlayFilter", startTime: 0, duration: c.timing.duration, values: { color: tint, alpha: 0.5 } }];
    out.push(c);
  }
  return out;
}

/** 프레임 탈출: 액자 안 사진이던 인물이 액자 밖으로 튀어나옴. spec = 원본 사진, subject = 같은 사진의 누끼. */
export function frameEscape({ from, to, W = 1080, H = 1920, spec, subject, frame = { x: 140, y: 520, width: 800, height: 900 }, at = from + 0.9, border = 22, wall = "#E8E2D6" }) {
  const inner = { x: frame.x + border, y: frame.y + border, width: frame.width - border * 2, height: frame.height - border * 2 };
  const matte = shape("frame_window", "rectangle", from, to, inner, { fill: "#FFFFFF" });
  const lift = [[from, { scale: 1, y: 0 }], [at, { scale: 1, y: 0 }, "easeOutBack"], [at + 0.45, { scale: 1.22, y: -150 }], [to, { scale: 1.24, y: -160 }]];
  return [
    shape("frame_wall", "rectangle", from, to, full(W, H), { fill: wall }),
    shape("frame_shadow", "rounded", from, to, { ...frame, x: frame.x + 18, y: frame.y + 26 }, { fill: "#000000", fillOpacity: 0.18, borderRadius: 8 }),
    shape("frame_border", "rectangle", from, to, frame, { fill: "#2B2118" }),
    matte,
    scene("frame_photo", spec, from, to, full(W, H), { style: { matte: { clipId: matte.id, mode: "alpha" } } }),
    // 탈출 전: 액자 안에서만 보임 / 탈출 후: 액자 밖까지 그대로
    subjectClip(subject, from, to, { name: "escape_inside", style: { matte: { clipId: matte.id, mode: "alpha" } }, animations: [keys(from, to, lift)] }),
    subjectClip(subject, at, to, { name: "escape_out", animations: [keys(at, to, lift.filter(([t]) => t >= at))] }),
  ];
}

// ═════════════════════════════ 3. 얼굴 추적 (3) — track = [[t, x, y], …] 머리·얼굴 위치(캔버스 px). 고정이면 점 하나

const follow = (from, to, track, anchor, extra = () => ({})) => {
  const pts = track.length ? track : [[from, anchor.x, anchor.y]];
  const stops = pts.map(([t, x, y]) => [Math.min(to, Math.max(from, t)), { x: r2(x - anchor.x), y: r2(y - anchor.y), ...extra(t) }]);
  if (stops[0][0] > from) stops.unshift([from, { ...stops[0][1] }]);
  return stops;
};
/** 정지점 두 목록을 시간축으로 합침(같은 시각은 키를 합침) */
const mergeStops = (...lists) => {
  const m = new Map();
  for (const l of lists) for (const [t, v, e] of l) { const k = +t.toFixed(4); const cur = m.get(k) ?? [k, {}, undefined]; Object.assign(cur[1], v); if (e) cur[2] = e; m.set(k, cur); }
  return [...m.values()].sort((a, b) => a[0] - b[0]);
};

/** 머리 위 라벨: 머리 위에 이름표(알약 + 꼬리선)가 붙어 따라다님. */
export function headLabel({ from, to, track = [], head, label = "사장님 추천", color = "#FFE14D", ink = "#111111", font = FONT.bold, size = 52, gap = 150 }) {
  const w = Math.max(260, label.length * size * 0.95 + 80), h = Math.round(size * 1.7);
  const anchor = { x: head.x, y: head.y }, pill = boxAt(head.x, head.y - gap - h / 2, w, h);
  const appear = [[from, { scale: 0.3, opacity: 0 }], [from + 0.08, { scale: 0.3, opacity: 0 }, "easeOutBack"], [from + 0.42, { scale: 1, opacity: 1 }], [to - 0.2, {}], [to, { opacity: 0, scale: 0.8 }]];
  const pos = follow(from, to, track, anchor);
  const anim = keys(from, to, mergeStops(pos, appear));
  return [
    shape("label_stem", "rectangle", from, to, { x: Math.round(head.x - 3), y: Math.round(head.y - gap), width: 6, height: Math.round(gap - 60) }, { fill: color }, { animations: [keys(from, to, mergeStops(pos, [[from, { opacity: 0 }], [from + 0.3, { opacity: 1 }], [to - 0.2, {}], [to, { opacity: 0 }]]))] }),
    shape("label_pill", "pill", from, to, pill, { fill: color }, { animations: [anim] }),
    text("label_text", label, from, to, pill, { ...f(font), fontSize: size, color: ink }, { animations: [structuredClone(anim)] }),
  ];
}

/** 얼굴 스캔: 얼굴에 모서리 괄호·점 격자·스캔 선·분석 % 숫자가 붙음. face = {x, y, w, h} (가운데 기준). */
export function faceScan({ from, to, track = [], face, color = "#2EE6FF", label = "MATCH", value = 98, font = FONT.mono }) {
  const b = boxAt(face.x, face.y, face.w, face.h), L = Math.min(face.w, face.h) * 0.22, sw = 8;
  const brackets = svgUrl(b.width, b.height, [[0, 0, 1, 1], [b.width, 0, -1, 1], [0, b.height, 1, -1], [b.width, b.height, -1, -1]].map(([x, y, sx, sy]) =>
    `<path d="M${x + sx * sw / 2} ${y + sy * L} L${x + sx * sw / 2} ${y + sy * sw / 2} L${x + sx * L} ${y + sy * sw / 2}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="square"/>`).join(""));
  const rnd = seededRandom(5);
  const dots = svgUrl(b.width, b.height, Array.from({ length: 70 }, () => { const x = b.width * (0.15 + rnd() * 0.7), y = b.height * (0.12 + rnd() * 0.78); return `<circle cx="${r2(x)}" cy="${r2(y)}" r="4" fill="${color}"/>`; }).join("") +
    Array.from({ length: 40 }, () => `<line x1="${r2(b.width * (0.2 + rnd() * 0.6))}" y1="${r2(b.height * (0.15 + rnd() * 0.7))}" x2="${r2(b.width * (0.2 + rnd() * 0.6))}" y2="${r2(b.height * (0.15 + rnd() * 0.7))}" stroke="${color}" stroke-width="1.5" opacity="0.5"/>`).join(""));
  const anchor = { x: face.x, y: face.y }, pos = follow(from, to, track, anchor);
  const lineBox = { x: b.x - 20, y: b.y, width: b.width + 40, height: 10 };
  const scan = []; for (let t = from + 0.2, k = 0; t <= to - 0.3; t += 0.7, k++) scan.push([t, { y: 0 }], [t + 0.65, { y: b.height - 10 }]);
  const lab = { x: b.x, y: b.y + b.height + 20, width: Math.max(b.width, 420), height: 70 };
  const show = (at) => [[from, { opacity: 0 }], [at, { opacity: 0 }], [at + 0.15, { opacity: 1 }], [to - 0.2, {}], [to, { opacity: 0 }]];
  return [
    image("scan_dots", dots, from, to, b, { animations: [keys(from, to, mergeStops(pos, [[from, { opacity: 0 }], [from + 0.4, { opacity: 0 }], [from + 0.8, { opacity: 0.8 }], [to - 0.2, {}], [to, { opacity: 0 }]]))] }),
    image("scan_brackets", brackets, from, to, b, { animations: [keys(from, to, mergeStops(pos, [[from, { scale: 1.5, opacity: 0 }], [from + 0.35, { scale: 1, opacity: 1 }, "easeOutExpo"], [to - 0.2, {}], [to, { opacity: 0 }]]))] }),
    shape("scan_line", "rectangle", from, to, lineBox, { fill: color, fillOpacity: 0.85 }, { animations: [keys(from, to, mergeStops(pos, scan, show(from + 0.2)))] }),
    text("scan_label", `${label} ${value}%`, from, to, lab, { ...f(font), fontSize: 46, color, align: "left" }, { animations: [
      { type: "countUp", options: { duration: us(Math.min(1.4, to - from - 0.6)), delay: us(0.4), easing: "easeOutCubic" }, params: { from: 0, to: value } },
      keys(from, to, mergeStops(pos, show(from + 0.35)))] }),
  ];
}

/** 이모지 SVG (시스템 이모지 글꼴에 기대지 않음): heart · laugh · fire · wow · thumbs · star */
export function emojiSvg(kind, s = 160) {
  const face = (mouth, eyes) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.46}" fill="#FFD43B" stroke="#E8A400" stroke-width="${s * 0.03}"/>${eyes}${mouth}`;
  const eye = (cx, cy, r) => `<ellipse cx="${cx}" cy="${cy}" rx="${r * 0.8}" ry="${r}" fill="#3B2A00"/>`;
  const body = {
    heart: `<path d="M${s / 2} ${s * 0.86} C ${s * 0.05} ${s * 0.55} ${s * 0.08} ${s * 0.12} ${s * 0.32} ${s * 0.14} C ${s * 0.42} ${s * 0.15} ${s * 0.48} ${s * 0.22} ${s / 2} ${s * 0.3} C ${s * 0.52} ${s * 0.22} ${s * 0.58} ${s * 0.15} ${s * 0.68} ${s * 0.14} C ${s * 0.92} ${s * 0.12} ${s * 0.95} ${s * 0.55} ${s / 2} ${s * 0.86} Z" fill="#FF3B5C"/>`,
    laugh: face(`<path d="M${s * 0.26} ${s * 0.56} Q ${s / 2} ${s * 0.92} ${s * 0.74} ${s * 0.56} Z" fill="#7A2E00"/>`, `<path d="M${s * 0.27} ${s * 0.38} q${s * 0.08} -${s * 0.08} ${s * 0.16} 0 M${s * 0.57} ${s * 0.38} q${s * 0.08} -${s * 0.08} ${s * 0.16} 0" stroke="#3B2A00" stroke-width="${s * 0.05}" fill="none" stroke-linecap="round"/>`),
    wow: face(`<ellipse cx="${s / 2}" cy="${s * 0.68}" rx="${s * 0.09}" ry="${s * 0.12}" fill="#7A2E00"/>`, eye(s * 0.35, s * 0.4, s * 0.06) + eye(s * 0.65, s * 0.4, s * 0.06)),
    fire: `<path d="M${s / 2} ${s * 0.06} C ${s * 0.62} ${s * 0.3} ${s * 0.86} ${s * 0.4} ${s * 0.82} ${s * 0.64} C ${s * 0.78} ${s * 0.86} ${s * 0.62} ${s * 0.95} ${s / 2} ${s * 0.95} C ${s * 0.3} ${s * 0.95} ${s * 0.16} ${s * 0.82} ${s * 0.18} ${s * 0.62} C ${s * 0.2} ${s * 0.46} ${s * 0.32} ${s * 0.4} ${s * 0.36} ${s * 0.26} C ${s * 0.44} ${s * 0.36} ${s * 0.44} ${s * 0.44} ${s * 0.48} ${s * 0.48} C ${s * 0.54} ${s * 0.36} ${s * 0.52} ${s * 0.2} ${s / 2} ${s * 0.06} Z" fill="#FF6A1A"/><path d="M${s / 2} ${s * 0.5} C ${s * 0.62} ${s * 0.62} ${s * 0.64} ${s * 0.9} ${s / 2} ${s * 0.9} C ${s * 0.38} ${s * 0.9} ${s * 0.36} ${s * 0.72} ${s / 2} ${s * 0.5} Z" fill="#FFD43B"/>`,
    thumbs: `<rect x="${s * 0.12}" y="${s * 0.46}" width="${s * 0.18}" height="${s * 0.42}" rx="${s * 0.04}" fill="#2F6BFF"/><path d="M${s * 0.34} ${s * 0.48} L${s * 0.5} ${s * 0.12} C ${s * 0.6} ${s * 0.1} ${s * 0.64} ${s * 0.2} ${s * 0.6} ${s * 0.32} L${s * 0.56} ${s * 0.42} L${s * 0.82} ${s * 0.42} C ${s * 0.92} ${s * 0.44} ${s * 0.92} ${s * 0.56} ${s * 0.84} ${s * 0.58} C ${s * 0.92} ${s * 0.62} ${s * 0.88} ${s * 0.72} ${s * 0.8} ${s * 0.72} C ${s * 0.86} ${s * 0.78} ${s * 0.82} ${s * 0.88} ${s * 0.72} ${s * 0.88} L${s * 0.34} ${s * 0.88} Z" fill="#FFD43B" stroke="#E8A400" stroke-width="${s * 0.025}"/>`,
    star: `<path d="${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.2 : s * 0.46; return `${i ? "L" : "M"}${r2(s / 2 + Math.cos(a) * r)} ${r2(s / 2 + Math.sin(a) * r)}`; }).join(" ")} Z" fill="#FFD43B" stroke="#E8A400" stroke-width="${s * 0.03}"/>`,
  }[kind] ?? "";
  return svgUrl(s, s, body);
}

/** 이모지 반응: 얼굴 옆에서 이모지가 톡톡 튀어나와 위로 떠오름(라이브 방송 반응). */
export function emojiReact({ from, to, anchor, track = [], kinds = ["heart", "laugh", "fire", "wow", "thumbs", "heart"], every = 0.28, size = 150, spread = 220, rise = 520, life = 1.6, seed = 11 }) {
  const out = [], rnd = seededRandom(seed);
  for (let t = from, i = 0; t < to - 0.3; t += every, i++) {
    const kind = kinds[i % kinds.length], end = Math.min(to, t + life), dx = (rnd() - 0.5) * spread, sway = (rnd() - 0.5) * 120;
    const base = track.length ? (track.find(([tt]) => tt >= t) ?? track[track.length - 1]) : [t, anchor.x, anchor.y];
    const b = boxAt(base[1] + dx, base[2], size, size);
    out.push(image(`emoji_${kind}`, emojiSvg(kind, size), t, end, b, { animations: [keys(t, end, [
      [t, { scale: 0.2, opacity: 0, y: 0, x: 0, angle: (rnd() - 0.5) * 30 }], [t + 0.22, { scale: 1.15, opacity: 1, y: -60 }, "easeOutBack"],
      [t + 0.4, { scale: 1 }], [end - 0.3, { y: -rise * 0.8, x: sway }], [end, { y: -rise, x: sway * 1.2, opacity: 0, scale: 0.8 }]])] }));
  }
  return out;
}

// ═════════════════════════════ 4. 화면 오버레이 (8)

const windowSvg = (w, h, { dark = false, title = true } = {}) => svgUrl(w, h, `<rect x="6" y="10" width="${w - 12}" height="${h - 16}" rx="22" fill="#000" opacity="0.25"/>
<rect width="${w - 6}" height="${h - 12}" rx="22" fill="${dark ? "#1B1D24" : "#FFFFFF"}" stroke="${dark ? "#30333D" : "#D9DCE3"}" stroke-width="2"/>
${title ? `<path d="M0 22 a22 22 0 0 1 22 -22 h${w - 50} a22 22 0 0 1 22 22 v40 h-${w - 6} z" fill="${dark ? "#2A2D36" : "#EEF0F4"}"/>` : ""}
<circle cx="36" cy="32" r="10" fill="#FF5F57"/><circle cx="66" cy="32" r="10" fill="#FEBC2E"/><circle cx="96" cy="32" r="10" fill="#28C840"/>`);

/** 창 팝업: 운영체제 창이 계단식으로 톡톡 열림. windows = [{ title, body, box }] */
export function windowPopup({ from, to, windows, stagger = 0.35, font = FONT.bold, dark = false }) {
  const out = [];
  windows.forEach((w, i) => {
    const at = from + i * stagger, b = w.box;
    const a = keys(from, to, [[from, { scale: 0.6, opacity: 0, y: 30 }], [at, { scale: 0.6, opacity: 0, y: 30 }, "easeOutBack"], [at + 0.32, { scale: 1, opacity: 1, y: 0 }], [to - 0.15, {}], [to, { scale: 0.9, opacity: 0 }]]);
    out.push(image("win", windowSvg(b.width, b.height, { dark }), from, to, b, { animations: [a] }));
    out.push(text("win_title", w.title ?? "", from, to, { x: b.x + 120, y: b.y + 8, width: b.width - 140, height: 48 }, { ...f(font), fontSize: 28, color: dark ? "#C9CDD6" : "#555B66", align: "left" }, { animations: [structuredClone(a)] }));
    if (w.body) out.push(text("win_body", w.body, from, to, { x: b.x + 40, y: b.y + 80, width: b.width - 80, height: b.height - 110 }, { ...f(font), fontSize: w.size ?? 54, color: dark ? "#FFFFFF" : "#111318", lineHeight: 1.3 }, { animations: [structuredClone(a)] }));
  });
  // 같은 크기 박스끼리는 scale 기준점이 같아 함께 움직임. 창 안 글자도 같은 키프레임을 쓰면 창과 같이 커지지 않으므로 박스를 창 가운데 기준으로 둠
  for (const c of out) if (c.type === "Text") { const w = windows.find((ww) => c.transform.x >= ww.box.x && c.transform.x <= ww.box.x + ww.box.width && c.transform.y >= ww.box.y && c.transform.y <= ww.box.y + ww.box.height); if (w) relativeScale(c, w.box); }
  return out;
}
/** 부모 박스와 같은 scale 키프레임을 쓰는 자식이 부모 가운데 기준으로 커지게 x·y 보정 */
function relativeScale(child, parent) {
  const pc = centerOf(parent), cc = centerOf(child.transform);
  for (const a of child.animations) if (a.type === "keyframes") for (const st of Object.values(a.params)) if (st.scale !== undefined) {
    st.x = r2((st.x ?? 0) + (cc.x - pc.x) * (st.scale - 1));
    st.y = r2((st.y ?? 0) + (cc.y - pc.y) * (st.scale - 1));
  }
}

/** 댓글 폭포: 댓글 말풍선이 아래에서 끝없이 올라옴. comments = [{ name, text }] */
export function commentWaterfall({ from, to, W = 1080, H = 1920, comments, x = 60, width = W * 0.72, every = 0.45, speed = 420, font = FONT.bold, avatarColors = ["#FF8FAB", "#7FD1FF", "#FFD166", "#9EE493", "#C3A6FF"] }) {
  const out = [], bh = 150;
  let i = 0;
  for (let t = from; t < to - 0.2; t += every, i++) {
    const c = comments[i % comments.length], end = Math.min(to, t + (H * 0.75) / speed);
    const b = { x, y: Math.round(H * 0.86), width: Math.round(width), height: bh };
    const svg = svgUrl(b.width, bh, `<rect width="${b.width}" height="${bh}" rx="30" fill="#000" fill-opacity="0.55"/><circle cx="72" cy="${bh / 2}" r="44" fill="${avatarColors[i % avatarColors.length]}"/>`);
    const rise = -Math.round(speed * (end - t));
    const a = keys(t, end, [[t, { y: 60, opacity: 0, scale: 0.9 }], [t + 0.25, { y: 0, opacity: 1, scale: 1 }, "easeOutCubic"], [end - 0.4, { y: Math.round(rise * 0.85) }], [end, { y: rise, opacity: 0 }]]);
    out.push(image("comment_bg", svg, t, end, b, { animations: [a] }));
    out.push(text("comment_name", c.name, t, end, { x: b.x + 140, y: b.y + 18, width: b.width - 170, height: 44 }, { ...f(font), fontSize: 30, color: "#B9BEC8", align: "left" }, { animations: [structuredClone(a)] }));
    out.push(text("comment_text", c.text, t, end, { x: b.x + 140, y: b.y + 58, width: b.width - 170, height: 72 }, { ...f(font), fontSize: 42, color: "#FFFFFF", align: "left" }, { animations: [structuredClone(a)] }));
  }
  return out;
}

/** 손글씨 낙서: 화면 위에 펜으로 그린 동그라미·화살표·밑줄·별이 그려지고 손떨림이 남음. marks = [{ kind, target:{x,y,width,height}, at, color }] */
export function handDoodle({ from, to, marks, color = "#FF3B5C", sw = 10 }) {
  return marks.map((m, i) => {
    const box = m.kind === "star" ? m.target : annotationBox(m.kind, m.target), at = m.at ?? from + i * 0.4;
    const d = m.kind === "star" ? starPath(box.width, box.height) : annotationPath(m.kind, box.width, box.height, { seed: 3 + i }).path;
    return shape(`doodle_${m.kind}`, "path", at, to, { x: Math.round(box.x - sw / 2), y: Math.round(box.y - sw / 2), width: Math.round(box.width + sw), height: Math.round(box.height + sw) },
      { path: d, viewBox: [0, 0, box.width, box.height], fill: "transparent", fillOpacity: 0, stroke: { color: m.color ?? color, width: m.width ?? sw, cap: "round", join: "round" } }, {
        animations: [{ type: "strokeDraw", options: { duration: us(m.draw ?? 0.55), easing: "easeInOutCubic" }, params: { fill: "none" } },
          { type: "lineBoil", options: { duration: us(to - at), easing: "linear" }, params: { amount: 2.5, scale: 14, fps: 10, variants: 3 } }] });
  });
}
const starPath = (w, h) => Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.22 : 0.5; return `${i ? "L" : "M"}${r2(w / 2 + Math.cos(a) * r * w)} ${r2(h / 2 + Math.sin(a) * r * h)}`; }).join(" ");

/** 라이브 커서: 이름표 달린 마우스 커서가 화면을 돌아다니며 클릭(물결)함. path = [[t, x, y]], clicks = [t] */
export function liveCursor({ from, to, path, clicks = [], name = "디자이너", color = "#7C5CFF", font = FONT.bold }) {
  const cw = 64, ch = 80, tagW = Math.max(160, name.length * 34 + 50);
  const svg = svgUrl(cw, ch, `<path d="M6 4 L6 66 L22 52 L34 76 L46 70 L34 46 L56 46 Z" fill="${color}" stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round"/>`);
  const [t0, x0, y0] = path[0];
  const pos = path.map(([t, x, y]) => [t, { x: x - x0, y: y - y0 }, "easeInOutCubic"]);
  const press = clicks.flatMap((t) => [[t - 0.06, { scale: 1 }], [t, { scale: 0.82 }], [t + 0.1, { scale: 1 }]]);
  const cur = { x: x0, y: y0, width: cw, height: ch }, tag = { x: x0 + 46, y: y0 + 62, width: tagW, height: 54 };
  const appear = [[from, { opacity: 0 }], [Math.max(from, t0 - 0.2), { opacity: 0 }], [t0, { opacity: 1 }], [to - 0.2, {}], [to, { opacity: 0 }]];
  const out = [
    image("cursor", svg, from, to, cur, { animations: [keys(from, to, mergeStops(pos, press, appear))] }),
    shape("cursor_tag", "pill", from, to, tag, { fill: color }, { animations: [keys(from, to, mergeStops(pos, appear))] }),
    text("cursor_name", name, from, to, tag, { ...f(font), fontSize: 30, color: "#FFFFFF" }, { animations: [keys(from, to, mergeStops(pos, appear))] }),
  ];
  for (const t of clicks) {
    const p = interpPath(path, t);
    out.unshift(shape("click_ripple", "circle", t, Math.min(to, t + 0.5), boxAt(p.x + 8, p.y + 6, 120, 120), { fill: "transparent", fillOpacity: 0, stroke: { color, width: 8 } }, {
      animations: [keys(t, Math.min(to, t + 0.5), [[t, { scale: 0.2, opacity: 1 }], [Math.min(to, t + 0.5), { scale: 1.4, opacity: 0 }, "easeOutCubic"]])] }));
  }
  return out;
}
function interpPath(path, t) {
  for (let i = 1; i < path.length; i++) if (t <= path[i][0]) { const [ta, xa, ya] = path[i - 1], [tb, xb, yb] = path[i]; const u = (t - ta) / Math.max(1e-6, tb - ta); return { x: xa + (xb - xa) * u, y: ya + (yb - ya) * u }; }
  const l = path[path.length - 1]; return { x: l[1], y: l[2] };
}

/**
 * 타자 효과(글자 수만큼 계단 wipe). 고정폭 글꼴이면 한 글자씩 정확히 드러남. 한 줄 = Text 클립 하나.
 * charW = 글자 폭(px) — Space Mono 0.6 × fontSize, 한글 ≈ 1.0 × fontSize
 */
function typedLine(prefix, str, at, to, x, y, size, color, font, charW, cps, extraStyle = {}) {
  const n = Array.from(str).length, dur = n / cps, w = Math.ceil(n * charW) + 8;
  return { clip: text(prefix, str, at, to, { x: Math.round(x), y: Math.round(y), width: w, height: Math.round(size * 1.4) }, { ...f(font), fontSize: size, color, align: "left", ...extraStyle }, {
    animations: [{ type: "wipe", options: { duration: us(dur), delay: 0, easing: `steps(${Math.max(1, n)})` }, params: { direction: "right" } }] }), end: at + dur, width: n * charW };
}
/** 깜빡이는 블록 커서(steps 깜빡임 + 줄 끝까지 계단 이동) */
function blinkCursor(from, to, x, y, w, h, color, moves = []) {
  const stops = [[from, { opacity: 1, x: 0, y: 0 }]];
  for (const [t, dx, dy, n, dur] of moves) stops.push([t, { x: stops[stops.length - 1][1].x ?? 0, y: dy }, `steps(${Math.max(1, n)})`], [t + dur, { x: dx, y: dy }]);
  const blink = []; for (let t = from; t < to; t += 0.5) blink.push([t, { opacity: 1 }], [t + 0.25, { opacity: 1 }], [t + 0.26, { opacity: 0 }], [t + 0.49, { opacity: 0 }]);
  // 타이핑 중에는 켜 둠
  const typing = (t) => moves.some(([s, , , , d]) => t >= s && t <= s + d);
  const bl = blink.filter(([t]) => !typing(t));
  return shape("cursor_block", "rectangle", from, to, { x: Math.round(x), y: Math.round(y), width: w, height: h }, { fill: color }, { animations: [keys(from, to, mergeStops(stops, bl))] });
}

/** 터미널 타이핑: 검은 터미널 창에 명령어가 한 글자씩 쳐지고 결과가 찍힘. lines = [{ cmd, out? }] */
export function terminalTyping({ from, to, W = 1080, box = { x: 60, y: 560, width: W - 120, height: 760 }, lines, size = 38, cps = 18, color = "#3BFF7A", outColor = "#E6E6E6", prompt = "$ ", gap = 0.35 }) {
  const font = FONT.mono, cw = size * 0.6, lh = size * 1.5;
  const out = [image("term_win", windowSvg(box.width, box.height, { dark: true }), from, to, box, { animations: [keys(from, to, [[from, { scale: 0.92, opacity: 0 }], [from + 0.3, { scale: 1, opacity: 1 }, "easeOutCubic"], [to, {}]])] })];
  let t = from + 0.45, row = 0;
  const x0 = box.x + 40, y0 = box.y + 90, moves = [];
  for (const l of lines) {
    const y = y0 + row * lh;
    out.push(text("term_prompt", prompt.trim(), t, to, { x: x0, y, width: Math.ceil(cw * prompt.length), height: Math.round(size * 1.4) }, { ...f(font), fontSize: size, color: "#7C8BFF", align: "left" }));
    const tl = typedLine("term_cmd", l.cmd, t, to, x0 + cw * prompt.length, y, size, color, font, cw, cps);
    out.push(tl.clip);
    moves.push([t, cw * (prompt.length + Array.from(l.cmd).length), row * lh, Array.from(l.cmd).length, tl.end - t]);
    t = tl.end + gap; row++;
    for (const o of [].concat(l.out ?? [])) {
      out.push(text("term_out", o, t, to, { x: x0, y: y0 + row * lh, width: box.width - 80, height: Math.round(size * 1.4) }, { ...f(font), fontSize: size, color: outColor, align: "left" }, {
        animations: [keys(t, to, [[t, { opacity: 0 }], [t + 0.05, { opacity: 1 }], [to, {}]])] }));
      t += 0.12; row++;
    }
    t += gap;
  }
  // 커서: 마지막 줄 다음 줄 앞으로
  moves.push([t - gap, cw * prompt.length, row * lh, 1, 0.01]);
  out.push(blinkCursor(from + 0.45, to, x0 + cw * prompt.length, y0 + 6, Math.round(cw), Math.round(size * 1.15), color, moves));
  return out;
}

/** 예측 키보드: 휴대폰 입력창에 문장이 쳐지고, 위 추천 단어 칸이 단어마다 바뀌며 눌림. words = 문장 단어들, suggestions = 단어마다 [3개] */
export function predictiveKeyboard({ from, to, W = 1080, H = 1920, words = ["오늘", "점심은", "여기"], suggestions = [["오늘", "내일", "지금"], ["점심은", "저녁은", "간식은"], ["여기", "거기", "여기로"]], size = 56, cps = 8, font = FONT.bold, accent = "#2F6BFF" }) {
  const kbH = Math.round(W * 0.78), kb = { x: 0, y: H - kbH, width: W, height: kbH };
  const rowsK = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"], kw = (W - 22 * 11) / 10, kh = 118;
  let keysSvg = `<rect width="${W}" height="${kbH}" fill="#D3D6DD"/><rect y="0" width="${W}" height="120" fill="#E5E7EC"/>`;
  rowsK.forEach((r, ri) => { const off = (W - (r.length * kw + (r.length - 1) * 22)) / 2; [...r].forEach((ch, ci) => { const x = off + ci * (kw + 22), y = 150 + ri * (kh + 26); keysSvg += `<rect x="${x}" y="${y}" width="${kw}" height="${kh}" rx="14" fill="#FFFFFF"/><text x="${x + kw / 2}" y="${y + kh * 0.66}" font-family="sans-serif" font-size="46" text-anchor="middle" fill="#222">${ch}</text>`; }); });
  keysSvg += `<rect x="${W * 0.22}" y="${150 + 3 * (kh + 26)}" width="${W * 0.56}" height="${kh}" rx="14" fill="#FFFFFF"/>`;
  keysSvg += `<line x1="${W / 3}" y1="24" x2="${W / 3}" y2="96" stroke="#B9BDC6" stroke-width="3"/><line x1="${(W * 2) / 3}" y1="24" x2="${(W * 2) / 3}" y2="96" stroke="#B9BDC6" stroke-width="3"/>`;
  const field = { x: 40, y: kb.y - 200, width: W - 80, height: 150 };
  const out = [
    image("kb", svgUrl(W, kbH, keysSvg), from, to, kb, { animations: [keys(from, to, [[from, { y: kbH }], [from + 0.35, { y: 0 }, "easeOutCubic"], [to, {}]])] }),
    shape("kb_field", "pill", from, to, field, { fill: "#FFFFFF", stroke: { color: "#C9CDD6", width: 3 } }, { animations: [keys(from, to, [[from, { opacity: 0 }], [from + 0.3, { opacity: 1 }], [to, {}]])] }),
  ];
  const cw = size * 1.0; let t = from + 0.5, xCur = field.x + 50;
  const r = seededRandom(3);
  words.forEach((wd, wi) => {
    // 추천 칸: 이 단어 동안 보임, 첫 칸(정답)이 눌리며 파랗게
    const sEnd = t + Array.from(wd).length / cps + 0.35;
    (suggestions[wi] ?? []).forEach((s, si) => {
      const sb = { x: Math.round((W / 3) * si), y: kb.y + 10, width: Math.round(W / 3), height: 100 };
      out.push(text("kb_sugg", s, t, sEnd, sb, { ...f(font), fontSize: 44, color: si === 0 ? accent : "#333" }, { animations: [keys(t, sEnd, [[t, { opacity: 0 }], [t + 0.08, { opacity: 1 }], [sEnd - 0.3, { scale: 1 }], [sEnd - 0.2, { scale: si === 0 ? 1.15 : 1 }], [sEnd, { scale: 1, opacity: 0 }]])] }));
    });
    const tl = typedLine("kb_word", wd, t, to, xCur, field.y + 34, size, "#111318", font, cw, cps);
    out.push(tl.clip);
    // 키 눌림(아무 글자 키 위 반짝) — 글자마다 하나
    Array.from(wd).forEach((_, ci) => {
      const kt = t + ci / cps, ri = Math.floor(r() * 3), row = rowsK[ri], ki = Math.floor(r() * row.length), off = (W - (row.length * kw + (row.length - 1) * 22)) / 2;
      out.push(shape("kb_press", "rounded", kt, Math.min(to, kt + 0.14), { x: Math.round(off + ki * (kw + 22)), y: Math.round(kb.y + 150 + ri * (kh + 26)), width: Math.round(kw), height: kh }, { fill: "#9AA3B5", borderRadius: 14 }));
    });
    xCur += tl.width + cw * 0.35; t = sEnd + 0.1;
  });
  return out;
}

/** 알림 폭탄: 휴대폰 알림 배너가 위에서 연달아 떨어지며 아래로 쌓임. items = [{ app, title, body, color }] */
export function notificationBomb({ from, to, W = 1080, items, every = 0.22, top = 140, x = 40, font = FONT.bold, max = 7 }) {
  const bw = W - x * 2, bh = 190, gap = 20, out = [];
  const n = Math.min(items.length, Math.floor((to - from - 0.3) / every) + 1);
  for (let i = 0; i < n; i++) {
    const it = items[i % items.length], at = from + i * every;
    const svg = svgUrl(bw, bh, `<rect width="${bw}" height="${bh}" rx="40" fill="#F4F5F8" fill-opacity="0.96"/><rect x="34" y="36" width="84" height="84" rx="22" fill="${it.color ?? "#FF3B5C"}"/>`);
    const stops = [[from, { y: -bh - top, opacity: 0 }], [at, { y: -bh - top, opacity: 0 }, "easeOutBack"], [at + 0.28, { y: 0, opacity: 1 }]];
    for (let j = i + 1; j < n; j++) { const tj = from + j * every, slot = j - i; stops.push([tj, { y: (slot - 1) * (bh + gap) }, "easeOutCubic"], [tj + 0.2, { y: slot * (bh + gap), opacity: slot >= max ? 0 : 1, scale: 1 - Math.min(0.12, slot * 0.015) }]); }
    stops.push([to - 0.2, {}], [to, { opacity: 0 }]);
    const b = { x, y: top, width: bw, height: bh }, a = keys(from, to, stops);
    out.unshift(
      image("noti", svg, from, to, b, { animations: [a] }),
      text("noti_app", it.app ?? "", from, to, { x: x + 146, y: top + 26, width: bw - 360, height: 44 }, { ...f(font), fontSize: 28, color: "#80858F", align: "left" }, { animations: [structuredClone(a)] }),
      text("noti_now", "지금", from, to, { x: x + bw - 180, y: top + 26, width: 140, height: 44 }, { ...f(font), fontSize: 28, color: "#80858F", align: "right" }, { animations: [structuredClone(a)] }),
      text("noti_title", it.title, from, to, { x: x + 146, y: top + 66, width: bw - 190, height: 54 }, { ...f(font), fontSize: 40, color: "#111318", align: "left" }, { animations: [structuredClone(a)] }),
      text("noti_body", it.body ?? "", from, to, { x: x + 146, y: top + 118, width: bw - 190, height: 50 }, { ...f(font), fontSize: 34, color: "#3B3F47", align: "left" }, { animations: [structuredClone(a)] }),
    );
  }
  // unshift라 나중 알림이 아래 — 최신 알림이 위로 오게 뒤집음
  return out;
}

/** 뉴스 속보: 빨간 "속보" 띠 + 헤드라인 바가 밀려 들어오고 아래 자막 티커가 흐름. */
export function breakingNews({ from, to, W = 1080, H = 1920, label = "속보", headline, ticker, y = H * 0.68, red = "#E3001B", font = FONT.bold, speed = 220 }) {
  const lb = { x: 40, y: Math.round(y), width: 230, height: 120 }, hb = { x: 40, y: Math.round(y + 120), width: W - 80, height: 150 }, tb = { x: 0, y: Math.round(y + 290), width: W, height: 80 };
  const live = { x: 60, y: 120, width: 170, height: 64 };
  const tickerW = Math.max(W * 2, ticker.length * 44), tt = { x: W, y: tb.y, width: Math.round(tickerW), height: 80 };
  const blink = []; for (let t = from; t < to; t += 0.6) blink.push([t, { opacity: 1 }], [t + 0.35, { opacity: 1 }], [t + 0.36, { opacity: 0.2 }], [t + 0.59, { opacity: 0.2 }]);
  return [
    shape("news_label", "rectangle", from, to, lb, { fill: red }, { animations: [{ type: "wipe", options: { duration: us(0.25), easing: "easeOutCubic" }, params: { direction: "right" } }] }),
    text("news_label_t", label, from, to, lb, { ...f(FONT.display), fontSize: 70, color: "#FFFFFF" }, { animations: [keys(from, to, [[from, { opacity: 0 }], [from + 0.15, { opacity: 0 }], [from + 0.3, { opacity: 1 }], [to, {}]])] }),
    shape("news_head", "rectangle", from + 0.2, to, hb, { fill: "#FFFFFF" }, { animations: [{ type: "wipe", options: { duration: us(0.35), easing: "easeOutExpo" }, params: { direction: "right" } }] }),
    text("news_head_t", headline, from + 0.35, to, { ...hb, x: hb.x + 30, width: hb.width - 60 }, { ...f(font), fontSize: 64, color: "#111318", align: "left" }, { animations: [keys(from + 0.35, to, [[from + 0.35, { x: -40, opacity: 0 }], [from + 0.7, { x: 0, opacity: 1 }, "easeOutCubic"], [to, {}]])] }),
    shape("news_ticker_bg", "rectangle", from + 0.3, to, tb, { fill: "#111318" }, { animations: [{ type: "wipe", options: { duration: us(0.3), easing: "easeOutCubic" }, params: { direction: "right" } }] }),
    text("news_ticker", ticker, from + 0.5, to, tt, { ...f(font), fontSize: 40, color: "#FFFFFF", align: "left" }, { animations: [keys(from + 0.5, to, [[from + 0.5, { x: 0 }], [to, { x: -Math.round(speed * (to - from - 0.5) + W * 0.2) }]])] }),
    shape("news_live", "pill", from, to, live, { fill: red }, { animations: [keys(from, to, [[from, { opacity: 0 }], [from + 0.2, { opacity: 1 }], [to, {}]])] }),
    text("news_live_t", "● LIVE", from, to, live, { ...f(FONT.bold), fontSize: 32, color: "#FFFFFF" }, { animations: [keys(from, to, blink)] }),
  ];
}

// ═════════════════════════════ 5. 전환·임팩트 (6)

/** 만화 임팩트: 순간 흑백 + 집중선 + 별 폭발 + "쾅!" 글자 + 흰 번쩍. target = 그 순간 보이는 소재 클립(흑백 효과·흔들림을 붙임) */
export function comicImpact({ at, dur = 0.9, W = 1080, H = 1920, target, word = "쾅!", color = "#FFE14D", ink = "#111111", center = { x: W / 2, y: H * 0.42 }, seed = 6 }) {
  const end = at + dur, out = [];
  if (target) {
    const lf = us(at) - target.timing.display.from;
    target.effects = [...(target.effects ?? []), { id: nid("fx_gray"), key: "grayscaleFilter", startTime: lf, duration: us(dur), values: {} }];
    target.animations = [...(target.animations ?? []), { type: "shake", options: { duration: us(0.35), delay: lf, easing: "linear" }, params: { frequency: 22, decay: 0.85, intensity: 18 } }];
  }
  const rnd = seededRandom(seed), R = Math.hypot(W, H);
  const lines = Array.from({ length: 90 }, (_, i) => { const a = (i / 90) * Math.PI * 2 + rnd() * 0.04, r0 = 260 + rnd() * 260, wdt = 0.006 + rnd() * 0.012;
    return `<path d="M${r2(center.x + Math.cos(a - wdt) * R)} ${r2(center.y + Math.sin(a - wdt) * R)} L${r2(center.x + Math.cos(a) * r0)} ${r2(center.y + Math.sin(a) * r0)} L${r2(center.x + Math.cos(a + wdt) * R)} ${r2(center.y + Math.sin(a + wdt) * R)} Z" fill="${ink}"/>`; }).join("");
  out.push(shape("impact_flash", "rectangle", at, Math.min(end, at + 0.14), full(W, H), { fill: "#FFFFFF" }, { animations: [keys(at, at + 0.14, [[at, { opacity: 1 }], [at + 0.14, { opacity: 0 }]])] }));
  out.push(image("impact_lines", svgUrl(W, H, lines), at, end, full(W, H), { animations: [keys(at, end, [[at, { scale: 1.15, opacity: 1 }], [at + 0.2, { scale: 1 }, "easeOutCubic"], [end - 0.15, { opacity: 1 }], [end, { opacity: 0 }]])] }));
  const sb = boxAt(center.x, center.y, W * 0.86, W * 0.7);
  out.push(shape("impact_burst", "star", at + 0.04, end, sb, { fill: color, stroke: { color: ink, width: 14 }, points: 14, innerRatio: 0.68 }, { animations: [keys(at + 0.04, end, [[at + 0.04, { scale: 0.2, angle: -20 }], [at + 0.22, { scale: 1.08, angle: 4 }, "easeOutBack"], [at + 0.32, { scale: 1, angle: 0 }], [end - 0.15, {}], [end, { scale: 1.3, opacity: 0 }]])] }));
  out.push(text("impact_word", word, at + 0.06, end, boxAt(center.x, center.y, W * 0.8, W * 0.36), { ...f(FONT.display), fontSize: Math.round(W * 0.24), color: "#FF2E4D", stroke: { color: ink, width: 16 } }, {
    animations: [keys(at + 0.06, end, [[at + 0.06, { scale: 2.6, angle: -14, opacity: 0 }], [at + 0.24, { scale: 1, angle: -8, opacity: 1 }, "easeOutBack"], [end - 0.15, { angle: -6 }], [end, { scale: 1.4, opacity: 0 }]])] }));
  return out;
}

const halfPolys = (W, H, ang, cx, cy, jag = 0, seed = 1) => {
  // 점 (cx,cy)를 지나고 각도 ang(도)인 선으로 화면을 둘로 나눈 두 다각형 path. jag>0이면 찢긴 지그재그
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), L = Math.hypot(W, H);
  const p0 = [cx - dx * L, cy - dy * L], p1 = [cx + dx * L, cy + dy * L], nx = -dy, ny = dx, rnd = seededRandom(seed);
  const pts = [];
  const segs = jag ? 60 : 1;
  for (let i = 0; i <= segs; i++) { const u = i / segs, j = jag && i && i < segs ? (rnd() - 0.5) * jag * 2 : 0; pts.push([p0[0] + (p1[0] - p0[0]) * u + nx * j, p0[1] + (p1[1] - p0[1]) * u + ny * j]); }
  const line = pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(" L");
  const sideA = `M${line} L${r2(p1[0] + nx * L)} ${r2(p1[1] + ny * L)} L${r2(p0[0] + nx * L)} ${r2(p0[1] + ny * L)} Z`;
  const sideB = `M${line} L${r2(p1[0] - nx * L)} ${r2(p1[1] - ny * L)} L${r2(p0[0] - nx * L)} ${r2(p0[1] - ny * L)} Z`;
  return { sideA, sideB, edge: `M${line}`, n: [nx, ny], d: [dx, dy] };
};

/** 화면 두 조각 분리(칼날 베기·종이 찢기 공용): 장면 A를 선을 따라 두 장으로 나눠 벌리고, 아래 장면 B가 드러남 */
function splitApart({ at, dur, W, H, fromSpec, toSpec, ang, jag, gapPx, rot, edgeColor, edgeW, prefix, seed, endTo }) {
  const end = at + dur, { sideA, sideB, edge, n } = halfPolys(W, H, ang, W / 2, H / 2, jag, seed), out = [];
  const tail = endTo ?? end + 1.2;
  out.push(scene(`${prefix}_next`, toSpec, at, tail, full(W, H)));
  [[sideA, 1], [sideB, -1]].forEach(([d, s]) => {
    const mv = keys(at, end, [[at, { x: 0, y: 0, angle: 0 }], [at + dur * 0.12, { x: 0, y: 0, angle: 0 }, "easeInCubic"], [end, { x: r2(n[0] * gapPx * s), y: r2(n[1] * gapPx * s), angle: rot * s }]]);
    const matte = shape(`${prefix}_matte`, "path", at, end, full(W, H), { path: d, viewBox: [0, 0, W, H], fill: "#FFFFFF" }, { animations: [mv] });
    out.push(matte, scene(`${prefix}_half`, fromSpec, at, end, full(W, H), { style: { matte: { clipId: matte.id, mode: "alpha" } }, animations: [structuredClone(mv)] }));
    if (edgeW) out.push(shape(`${prefix}_edge`, "path", at, end, full(W, H), { path: edge, viewBox: [0, 0, W, H], fill: "transparent", fillOpacity: 0, stroke: { color: edgeColor, width: edgeW, join: "round" } }, { animations: [structuredClone(mv)] }));
  });
  return out;
}

/** 칼날 베기: 사선으로 하얀 칼빛이 번쩍 지나간 뒤 화면이 두 조각으로 갈라지며 다음 장면. 장면 A 클립은 at에서 끝내 두세요. */
export function bladeSlash({ at, dur = 0.7, W = 1080, H = 1920, fromSpec, toSpec, angle = -58, endTo }) {
  const slash = boxAt(W / 2, H / 2, Math.hypot(W, H) * 1.1, 14);
  return [
    ...splitApart({ at: at + 0.12, dur: dur - 0.12, W, H, fromSpec, toSpec, ang: angle, jag: 0, gapPx: 260, rot: 3, edgeColor: "#FFFFFF", edgeW: 0, prefix: "blade", seed: 1, endTo }),
    scene("blade_hold", fromSpec, at, at + 0.12, full(W, H)),
    shape("blade_light", "rectangle", at, at + 0.3, { ...slash, angle }, { fill: "#FFFFFF" }, { animations: [keys(at, at + 0.3, [[at, { scaleX: 0, scaleY: 1, opacity: 1 }], [at + 0.1, { scaleX: 1, scaleY: 1.4 }, "easeOutExpo"], [at + 0.3, { scaleY: 0.1, opacity: 0 }]])],
      effects: [{ id: nid("fx_glow"), key: "glowFilter", startTime: 0, duration: us(0.3), values: { distance: 24, outerStrength: 4, innerStrength: 0, color: 0xbfe8ff, quality: 0.3 } }] }),
  ];
}

/** 종이 찢기: 화면이 종이처럼 지그재그로 찢어지며 벌어지고(흰 찢긴 단면) 다음 장면. */
export function paperTear({ at, dur = 0.9, W = 1080, H = 1920, fromSpec, toSpec, angle = 84, endTo }) {
  return splitApart({ at, dur, W, H, fromSpec, toSpec, ang: angle, jag: 22, gapPx: W * 0.62, rot: 6, edgeColor: "#F7F3EA", edgeW: 18, prefix: "tear", seed: 4, endTo });
}

/**
 * 글자 다이브: 다음 장면이 큰 글자 안에서만 보이다가 글자 획 속으로 날아 들어가 화면을 채움(트랙 매트 + 점 확대).
 * point = 글자 획 안의 점(캔버스 px) — 글꼴·크기를 바꾸면 스틸에서 다시 잼(samples/video-effects README).
 */
export function letterDive({ from, to, W = 1080, H = 1920, word = "GO", point, toSpec, box = { x: 0, y: H * 0.36, width: W, height: H * 0.24 }, size = W * 0.5, font = FONT.display, k = 40, hold = 0.6, endTo }) {
  const P = point ?? centerOf(box);
  const z = (s, extra = {}) => zoomAt(P, box, s, extra);
  const t1 = from + 0.45, t2 = t1 + hold, t3 = to;
  const title = text("dive_word", word, from, to, box, { ...f(font), fontSize: Math.round(size), color: "#000000" }, {
    animations: [keys(from, to, [[from, z(1.3, { opacity: 0 })], [t1, z(1, { opacity: 1 }), "easeOutExpo"], [t2, z(1), "easeInOutQuad"], [t2 + 0.15, z(0.94), "easeInExpo"], [t3, z(k)]])] });
  return [
    shape("dive_shadow", "rectangle", from, to, full(W, H), { fill: "#000000", fillOpacity: 0.35 }, { animations: [keys(from, to, [[from, { opacity: 0 }], [t1, { opacity: 1 }], [t2, {}], [t3, { opacity: 0 }]])] }),
    title,
    scene("dive_next", toSpec, from, to, full(W, H), { style: { matte: { clipId: title.id, mode: "alpha" } } }),
    scene("dive_after", toSpec, to, endTo ?? to + 1.2, full(W, H)),
  ];
}

/** 글리치: 소재 클립에 glitch → rgbSplit을 번갈아 걸고, 가로 띠 조각을 어긋나게 겹침. target = 소재 클립, spec = 같은 소재 스펙 */
export function glitch({ at, dur = 0.5, W = 1080, H = 1920, target, spec, bands = 4, seed = 8 }) {
  const out = [], rnd = seededRandom(seed), lf = us(at) - target.timing.display.from, half = us(dur / 2);
  target.effects = [...(target.effects ?? []),
    { id: nid("fx_glitch"), key: "glitchFilter", startTime: lf, duration: half, values: { slices: 12, offset: 60, direction: 0, red: { x: 6, y: 0 }, blue: { x: -6, y: 0 }, green: { x: 0, y: 0 }, fillMode: 2, seed: r2(rnd()) } },
    { id: nid("fx_rgb"), key: "rgbSplitFilter", startTime: lf + half, duration: half, values: { red: { x: -14, y: 0 }, green: { x: 0, y: 6 }, blue: { x: 14, y: 0 } } }];
  for (let i = 0; i < bands; i++) {
    const bh = 40 + rnd() * 140, by = rnd() * (H - bh), t0 = at + rnd() * dur * 0.6, t1 = Math.min(at + dur, t0 + 0.08 + rnd() * 0.18);
    const band = shape("glitch_band", "rectangle", t0, t1, { x: 0, y: Math.round(by), width: W, height: Math.round(bh) }, { fill: "#FFFFFF" });
    const sh = Math.round((rnd() - 0.5) * 160);
    const sliceSpec = spec.type === "Video" ? { ...spec, trimFrom: (spec.trimFrom ?? 0) + (t0 - target.timing.display.from / 1e6) } : spec;
    out.push(band, scene("glitch_slice", sliceSpec, t0, t1, full(W, H), { style: { matte: { clipId: band.id, mode: "alpha" } }, animations: [keys(t0, t1, [[t0, { x: sh }], [(t0 + t1) / 2, { x: -sh * 0.6 }, "steps(2)"], [t1, { x: sh * 0.3 }]])] }));
  }
  out.push(shape("glitch_noise", "rectangle", at + dur * 0.3, at + dur * 0.36, { x: 0, y: Math.round(H * 0.3), width: W, height: 12 }, { fill: "#FFFFFF", fillOpacity: 0.8 }));
  return out;
}

/** 화면 분할: 화면을 2·3·4칸으로 나눠 칸마다 다른 소재가 차례로 열림. specs = 장면 스펙 목록, layout = "2v"(위아래)·"2h"·"3v"·"4" */
export function splitScreen({ from, to, W = 1080, H = 1920, specs, layout = specs.length === 4 ? "4" : specs.length === 3 ? "3v" : "2v", gap = 12, stagger = 0.2, aspect = [W, H], line = "#FFFFFF" }) {
  const panels = [];
  if (layout === "2h") for (let i = 0; i < 2; i++) panels.push({ x: i * (W / 2) + (i ? gap / 2 : 0), y: 0, width: W / 2 - gap / 2, height: H });
  else if (layout === "4") for (let i = 0; i < 4; i++) panels.push({ x: (i % 2) * (W / 2) + (i % 2 ? gap / 2 : 0), y: Math.floor(i / 2) * (H / 2) + (i >= 2 ? gap / 2 : 0), width: W / 2 - gap / 2, height: H / 2 - gap / 2 });
  else { const n = layout === "3v" ? 3 : 2; for (let i = 0; i < n; i++) panels.push({ x: 0, y: i * (H / n) + (i ? gap / 2 : 0), width: W, height: H / n - (i && i < n - 1 ? gap : gap / 2) }); }
  const out = [shape("split_bg", "rectangle", from, to, full(W, H), { fill: line })];
  panels.forEach((p0, i) => {
    const p = { x: Math.round(p0.x), y: Math.round(p0.y), width: Math.round(p0.width), height: Math.round(p0.height) }, at = from + i * stagger;
    const dir = layout === "2h" || (layout === "4" && i % 2) ? { scaleX: 0 } : { scaleY: 0 };
    const matte = shape("split_panel", "rectangle", from, to, p, { fill: "#FFFFFF" }, { animations: [keys(from, to, [[from, { ...dir }], [at, { ...dir }, "easeOutExpo"], [at + 0.45, { scaleX: 1, scaleY: 1 }], [to, {}]])] });
    const c = scene("split_src", specs[i % specs.length], from, to, coverBox(p, aspect[0], aspect[1]), { style: { matte: { clipId: matte.id, mode: "alpha" } },
      animations: [keys(from, to, [[from, { scale: 1.25 }], [at, { scale: 1.25 }, "easeOutCubic"], [at + 0.7, { scale: 1.05 }], [to, { scale: 1 }]])] });
    out.push(matte, c);
  });
  return out;
}

// ═════════════════════════════ 6. 카메라 (4)

/** 돌리 줌(버티고): 인물 크기는 그대로인데 배경만 확 다가오거나 멀어짐. bgSpec = 배경(인물 지운 사진 또는 원본), subject = 누끼 */
export function dollyZoom({ from, to, W = 1080, H = 1920, bgSpec, subject, focus, zoom = 1.6, direction = "in" }) {
  const P = focus ?? centerOf(subject.box), bb = full(W, H);
  const [a, b] = direction === "in" ? [1, zoom] : [zoom, 1];
  return [
    scene("dolly_bg", bgSpec, from, to, bb, { animations: [keys(from, to, [[from, zoomAt(P, bb, a, { blur: 0 })], [from + (to - from) * 0.5, zoomAt(P, bb, (a + b) / 2, { blur: 1.5 }), "easeInOutSine"], [to, zoomAt(P, bb, b, { blur: 0 })]])] }),
    subjectClip(subject, from, to, { animations: [keys(from, to, [[from, { scale: 1 }], [to, { scale: direction === "in" ? 0.97 : 1.03 }]])] }),
  ];
}

/** 초점 이동: 앞(인물)과 뒤(배경)의 흐림을 맞바꿔 시선을 옮김. fg·bg = 이미 있는 클립(흐림 keyframes를 붙임) */
export function rackFocus({ at, dur = 0.6, fg, bg, amount = 10, toBack = true }) {
  const add = (c, a, b) => {
    const s = c.timing.display.from / 1e6, e = s + c.timing.duration / 1e6;
    c.animations = [...(c.animations ?? []), keys(s, e, [[s, { blur: a }], [at, { blur: a }, "easeInOutCubic"], [at + dur, { blur: b }], [e, { blur: b }]])];
  };
  if (toBack) { add(fg, 0, amount); add(bg, amount, 0); } else { add(fg, amount, 0); add(bg, 0, amount); }
  return [];
}

/**
 * 프리즈 줌: 영상이 멈춘 듯 정지 프레임으로 바뀌며 한 점으로 확 다가가고, 동그라미·라벨로 짚은 뒤 다시 재생.
 * frameSrc = at 시점 정지 프레임 이미지(ffmpeg -ss <at> -frames:v 1, 앱에서는 미리보기 캡처). spec = 영상 장면 스펙(trimFrom = 영상 클립 시작 원본 위치)
 * 반환: 앞 영상(…at) + 정지 컷(at…at+hold) + 뒤 영상(at+hold…) — 원래 영상 클립은 빼고 이걸로 바꿉니다.
 */
export function freezeZoom({ from, at, hold = 1.4, to, W = 1080, H = 1920, spec, frameSrc, point, label = "여기!", k = 1.8, color = "#FFE14D", font = FONT.bold }) {
  const bb = full(W, H), e = at + hold, tf = spec.trimFrom ?? 0;
  const ring = { x: point.x - 150, y: point.y - 150, width: 300, height: 300 };
  const P2 = { x: (point.x - W / 2) * k + W / 2, y: (point.y - H / 2) * k + H / 2 };
  // 확대 후 point를 화면 가운데로: 오프셋 = 가운데 − point의 확대 위치
  const off = { x: r2(W / 2 - P2.x), y: r2(H / 2 - P2.y) };
  const out = [
    scene("freeze_before", spec, from, at, bb),
    image("freeze_frame", frameSrc, at, e, bb, {
      effects: [{ id: nid("fx_freeze"), key: "adjustmentFilter", startTime: us(0.12), duration: us(hold - 0.12), values: { saturation: 0.35, contrast: 1.15, brightness: 1, gamma: 1, red: 1, green: 1, blue: 1, alpha: 1 } }],
      animations: [keys(at, e, [[at, { scale: 1, x: 0, y: 0 }], [at + 0.12, { scale: 1, x: 0, y: 0 }, "easeOutExpo"], [at + 0.5, { scale: k, ...off }], [e - 0.25, { scale: k * 1.03, ...off }, "easeInOutCubic"], [e, { scale: 1, x: 0, y: 0 }]])] }),
    shape("freeze_flash", "rectangle", at, at + 0.15, bb, { fill: "#FFFFFF" }, { animations: [keys(at, at + 0.15, [[at, { opacity: 0.9 }], [at + 0.15, { opacity: 0 }]])] }),
  ];
  // 확대 화면 기준으로 point는 가운데에 옴 → 링·라벨은 화면 가운데에 그림
  const ringBox = boxAt(W / 2, H / 2, ring.width * 1.1, ring.height * 1.1);
  const d = annotationPath("circle", ringBox.width, ringBox.height, { seed: 5 }).path;
  out.push(shape("freeze_ring", "path", at + 0.5, e - 0.25, ringBox, { path: d, viewBox: [0, 0, ringBox.width, ringBox.height], fill: "transparent", fillOpacity: 0, stroke: { color, width: 12, cap: "round", join: "round" } }, {
    animations: [{ type: "strokeDraw", options: { duration: us(0.4), easing: "easeInOutCubic" }, params: { fill: "none" } }] }));
  const lb = boxAt(W / 2, H / 2 - ringBox.height / 2 - 90, Math.max(260, label.length * 60 + 80), 110);
  out.push(shape("freeze_label_bg", "pill", at + 0.7, e - 0.25, lb, { fill: color }, { animations: [keys(at + 0.7, e - 0.25, [[at + 0.7, { scale: 0.4, opacity: 0 }], [at + 0.95, { scale: 1, opacity: 1 }, "easeOutBack"], [e - 0.25, {}]])] }));
  out.push(text("freeze_label", label, at + 0.7, e - 0.25, lb, { ...f(font), fontSize: 58, color: "#111318" }, { animations: [keys(at + 0.7, e - 0.25, [[at + 0.7, { scale: 0.4, opacity: 0 }], [at + 0.95, { scale: 1, opacity: 1 }, "easeOutBack"], [e - 0.25, {}]])] }));
  out.push(scene("freeze_after", { ...spec, trimFrom: tf + (at - from) }, e, to, bb));
  return out;
}

/**
 * 스피드 램프: 영상 한 구간을 여러 조각으로 나눠 조각마다 playbackRate를 바꿈(계단식 — 조각을 잘게 나눌수록 부드러움).
 * ramp = [[원본 길이(초), 속도], …] 또는 rampSegments()로 만든 목록. 반환 = 이어 붙은 Video 클립들(+ 끝 시각 end)
 */
export function speedRamp({ from, spec, ramp, box }) {
  let t = from, src = spec.trimFrom ?? 0;
  const out = [];
  for (const [len, rate] of ramp) {
    const d = len / rate;
    out.push(scene(`ramp_${rate}x`, { ...spec, trimFrom: src }, t, t + d, box, { playbackRate: rate }));
    t += d; src += len;
  }
  out.end = t;
  return out;
}
/** 속도 a→b를 n조각으로 부드럽게(지수 보간). 원본 총 길이 srcLen초 */
export const rampSegments = (a, b, srcLen, n = 6) => Array.from({ length: n }, (_, i) => [srcLen / n, r2(Math.min(4, Math.max(0.25, a * Math.pow(b / a, (i + 0.5) / n))))]);

// 카탈로그: id → [한글 이름, 카테고리, 함수 이름, 지원 수준]
// 지원 수준: ready = 바로 가능 · approx = 근사(고정 위치·계단식 등) · cutout = 누끼 PNG(사진)·그린스크린이면 가능, 일반 영상은 영상 매팅 필요
export const CATALOG = [
  ["clock-dial", "시계 다이얼", "behind", "clockDial", "cutout"], ["giant-type", "거대 글자", "behind", "giantType", "cutout"],
  ["post-wall", "게시물 벽", "behind", "postWall", "cutout"], ["orbit-ring", "궤도 링", "behind", "orbitRing", "cutout"],
  ["count-up", "숫자 카운트", "behind", "countUpBehind", "cutout"], ["chart-rise", "차트 상승", "behind", "chartRise", "cutout"],
  ["infinite-tunnel", "무한 터널", "behind", "infiniteTunnel", "cutout"],
  ["clone-lineup", "분신 줄세우기", "transform", "cloneLineup", "cutout"], ["head-stack", "머리 쌓기", "transform", "headStack", "cutout"],
  ["code-human", "코드 인간", "transform", "codeHuman", "cutout"], ["ascii-human", "아스키 인간", "transform", "asciiHuman", "cutout"],
  ["neon-outline", "네온 윤곽선", "transform", "neonOutline", "cutout"], ["sticker-pop", "스티커 팝", "transform", "stickerPop", "cutout"],
  ["halftone-print", "망점 인쇄", "transform", "halftonePrint", "ready"], ["banknote-portrait", "지폐 초상", "transform", "banknotePortrait", "approx"],
  ["color-split", "컬러 분리", "transform", "colorSplit", "ready"], ["echo-trail", "잔상 트레일", "transform", "echoTrail", "ready"],
  ["frame-escape", "프레임 탈출", "transform", "frameEscape", "cutout"],
  ["head-label", "머리 위 라벨", "face", "headLabel", "approx"], ["face-scan", "얼굴 스캔", "face", "faceScan", "approx"], ["emoji-react", "이모지 반응", "face", "emojiReact", "approx"],
  ["window-popup", "창 팝업", "overlay", "windowPopup", "ready"], ["comment-waterfall", "댓글 폭포", "overlay", "commentWaterfall", "ready"],
  ["hand-doodle", "손글씨 낙서", "overlay", "handDoodle", "ready"], ["live-cursor", "라이브 커서", "overlay", "liveCursor", "ready"],
  ["predictive-keyboard", "예측 키보드", "overlay", "predictiveKeyboard", "ready"], ["terminal-typing", "터미널 타이핑", "overlay", "terminalTyping", "ready"],
  ["notification-bomb", "알림 폭탄", "overlay", "notificationBomb", "ready"], ["breaking-news", "뉴스 속보", "overlay", "breakingNews", "ready"],
  ["comic-impact", "만화 임팩트", "impact", "comicImpact", "ready"], ["blade-slash", "칼날 베기", "impact", "bladeSlash", "ready"],
  ["paper-tear", "종이 찢기", "impact", "paperTear", "ready"], ["letter-dive", "글자 다이브", "impact", "letterDive", "ready"],
  ["glitch", "글리치", "impact", "glitch", "ready"], ["split-screen", "화면 분할", "impact", "splitScreen", "ready"],
  ["dolly-zoom", "돌리 줌", "camera", "dollyZoom", "cutout"], ["rack-focus", "초점 이동", "camera", "rackFocus", "cutout"],
  ["freeze-zoom", "프리즈 줌", "camera", "freezeZoom", "ready"], ["speed-ramp", "스피드 램프", "camera", "speedRamp", "approx"],
];
