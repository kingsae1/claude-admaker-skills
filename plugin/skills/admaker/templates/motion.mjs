// 모션 기본형: 샷 함수와 build-project.mjs가 함께 쓰는 순수 함수들.
// 각 함수는 엔진 animations[] 항목(또는 클립)을 돌려준다. 값의 근거는 references/aesthetic-rules.md, 레시피는 engine-recipes.md.
import { FPS, us } from "./timeline.mjs";

const frames = (n) => n / FPS; // 프레임 → 초

/** 입장 (R6, R7): opacity + y + scale. index를 주면 3–6프레임 시차를 delay로 더한다. */
export function entrance({ dur = 0.6, delay = 0, index = 0, gap = 4, y = 40, x = 0, scale = 0.96, blur = 0, easing = "easeOutExpo" } = {}) {
  const from = { opacity: 0, easing };
  if (y) from.y = y;
  if (x) from.x = x;
  if (scale !== 1) from.scale = scale;
  if (blur) from.blur = blur;
  const to = { opacity: 1, ...(y ? { y: 0 } : {}), ...(x ? { x: 0 } : {}), ...(scale !== 1 ? { scale: 1 } : {}), ...(blur ? { blur: 0 } : {}) };
  return holdFrom({ type: "keyframes", options: { duration: us(dur), delay: 0, easing: "linear" }, params: { "0%": from, "100%": to } }, delay + index * frames(gap));
}

/**
 * 엔진은 options.delay 전에는 keyframes·paint·마스크 모션을 아예 적용하지 않는다(0% 값이 걸리지 않음).
 * 입장처럼 "시작 전에도 0% 상태여야 하는" 모션은 delay를 쓰지 않고, 0%~delay 구간을 같은 값으로 붙잡는 stop을 앞에 넣는다.
 * anim: delay 0인 keyframes/paint 항목, delaySec: 클립 기준 시작 초.
 */
export function holdFrom(anim, delaySec) {
  if (!(delaySec > 0)) return anim;
  const d = us(delaySec), dur = anim.options.duration, total = d + dur;
  const remap = (k) => (/^from$/i.test(k) ? 0 : /^to$/i.test(k) ? 100 : parseFloat(k));
  const params = {};
  const stops = Object.entries(anim.params).map(([k, v]) => [remap(k), v]).sort((a, b) => a[0] - b[0]);
  const { easing: _e, ...first } = stops[0][1];
  params["0%"] = first; // 0 → delay: 그대로 둠
  for (const [pct, v] of stops) params[`${(((d + (pct / 100) * dur) / total) * 100).toFixed(3)}%`] = v;
  return { ...anim, options: { ...anim.options, duration: total, delay: 0 }, params };
}

/** 퇴장 (R8): 입장의 절반 길이, easeIn. clipDur(초)의 끝에 붙는다. 0%는 항등값이라 겹쳐도 안전. */
export function exit(clipDur, { dur = 0.3, y = -40, x = 0, easing = "easeInCubic" } = {}) {
  const to = { opacity: 0, ...(y ? { y } : {}), ...(x ? { x } : {}) };
  return { type: "keyframes", options: { duration: us(dur), delay: us(Math.max(0, clipDur - dur)), easing: "linear" },
    params: { "0%": { opacity: 1, ...(y ? { y: 0 } : {}), ...(x ? { x: 0 } : {}), easing }, "100%": to } };
}

/** Ken Burns (Q12): shotIndex가 홀수면 반대 방향(줌아웃). ui=true면 읽히는 화면용으로 약하게. */
export function kenBurns(clipDur, { shotIndex = 0, zoom = 1.08, pan = -25, ui = false } = {}) {
  const z = ui ? Math.min(zoom, 1.03) : zoom;
  const a = { scale: 1, x: 0 }, b = { scale: z, x: ui ? 0 : pan };
  const [s, e] = shotIndex % 2 ? [b, a] : [a, b];
  return { type: "keyframes", options: { duration: us(clipDur), delay: 0, easing: "linear" },
    params: { "0%": { ...s, easing: "easeInOutSine" }, "100%": { ...e } } };
}

/** 숨쉬기 (Q13): start(초, 클립 기준)부터 clipDur까지 반복. R1 정지 중인 브랜드 요소에는 쓰지 않는다.
 *  0%→50%→100%가 한 번 왕복이라 direction(alternate)이 필요 없다. admaker 불러오기 포맷은 direction을 보존하지 않는다. */
export function breathe(clipDur, start, { period = 6, scale = 1.015, y = -3 } = {}) {
  const left = clipDur - start;
  if (left < 2) return null;
  const ease = "easeInOutSine";
  return { type: "keyframes",
    options: { duration: us(period), delay: us(start), easing: "linear", iterCount: Math.ceil(left / period) },
    params: { "0%": { scale: 1, y: 0, easing: ease }, "50%": { scale, y, easing: ease }, "100%": { scale: 1, y: 0 } } };
}

/** 모션 블러 (Q14): 가로 이동 keyframes의 stop에 넣을 값. px/프레임 기준 30 이상일 때만. */
export const blurFor = (pxPerFrame) => (Math.abs(pxPerFrame) >= 30 ? Math.min(40, Math.round(Math.abs(pxPerFrame) / 3)) : 0);

/** 세로·대각선 모션 블러 (Q14): clip.effects 항목. start/dur는 클립 기준 초. */
export const motionBlurEffect = (id, start, dur, vy, vx = 0) =>
  ({ id, key: "motionBlurFilter", startTime: us(start), duration: us(dur), values: { velocity: { x: vx, y: vy }, kernelSize: 9 } });

// 결정적 PRNG (그레인 지터용)
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * 룩 스택 (Q11): SVG Image 클립.
 * footage: true(기본, 사용자 영상·이미지가 바닥) → 가장자리 비네트(0.18)만. 소재를 어둡게·뿌옇게 하는 틴트·그레인은 넣지 않는다.
 * footage: false(그래픽만으로 된 광고) → 생성 배경 · 틴트 · 그레인 · 비네트.
 * background: 소재가 프레임을 다 채우지 못할 때(레터박스) true로 주면 소재 아래(z 1)에 생성 배경을 깐다.
 * Backdrop·Effect 클립 대신 Image를 쓰는 이유: admaker 앱의 "광고 불러오기" 포맷(EncodingPayload)은
 * Backdrop·Effect를 받지 않는다. Image(SVG)는 렌더 하니스와 앱 양쪽에서 같은 모습으로 나온다.
 * 값은 렌더 검증 전 초기값.
 */
export function lookStack({ W, H, duration, brand, dark = true, footage = true, grain = !footage, background = !footage }) {
  const c = brand.colors ?? {};
  const bg = c.background ?? "#0A0A0F", hero = c.primary ?? c.accent ?? "#7C3AED", acc = c.accent ?? hero;
  const D = us(duration);
  const timing = { display: { from: 0, to: D }, duration: D, playbackRate: 1 };
  const tf = (x, y, w, h, z, opacity = 1) => ({ x, y, width: w, height: h, angle: 0, opacity, zIndex: z });

  // ① 배경: 단색 + 큰 방사형 빛 두 개, 프레임보다 12% 크게 두고 천천히 흐른다
  const bw = Math.round(W * 1.12), bh = Math.round(H * 1.12);
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="0 0 ${bw} ${bh}">`
    + `<defs><radialGradient id="a"><stop offset="0" stop-color="${hero}" stop-opacity="0.22"/><stop offset="0.62" stop-color="${hero}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="b"><stop offset="0" stop-color="${acc}" stop-opacity="0.14"/><stop offset="0.65" stop-color="${acc}" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="100%" height="100%" fill="${bg}"/>`
    + `<circle cx="${bw * 0.25}" cy="${bh * 0.12}" r="${Math.max(bw, bh) * 0.45}" fill="url(#a)"/>`
    + `<circle cx="${bw * 0.82}" cy="${bh * 0.9}" r="${Math.max(bw, bh) * 0.38}" fill="url(#b)"/></svg>`;
  const drift = { type: "keyframes", options: { duration: D, delay: 0, easing: "linear" },
    params: { "0%": { x: 0, y: 0, easing: "easeInOutSine" }, "100%": { x: -(bw - W) * 0.6, y: -(bh - H) * 0.4 } } };

  // ② 틴트: 강조색 반투명 면 (엔진 colorOverlay와 같은 일반 합성)
  const tintSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${hero}"/></svg>`;

  // ③ 그레인: 프레임보다 128px 큰 노이즈를 2프레임마다 다른 자리로 옮겨 깜빡이게 한다(1초 루프)
  const gw = W + 128, gh = H + 128;
  const grainSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${gw}" height="${gh}">`
    + `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter>`
    + `<rect width="100%" height="100%" filter="url(#n)"/></svg>`;
  const r = rng(42), jumps = 15, jitter = {};
  for (let i = 0; i < jumps; i++) {
    const p = (i / jumps) * 100, q = ((i + 1) / jumps) * 100 - 0.05;
    const v = { x: -Math.round(r() * 128), y: -Math.round(r() * 128) };
    jitter[`${p.toFixed(2)}%`] = v;
    jitter[`${q.toFixed(2)}%`] = v;
  }
  const grainAnim = { type: "keyframes", options: { duration: us(1), delay: 0, easing: "linear", iterCount: Math.ceil(duration) }, params: jitter };

  // ④ 비네트: 가운데 투명 → 가장자리 어둡게
  const vigSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
    + `<defs><radialGradient id="v" cx="50%" cy="50%" r="72%"><stop offset="${footage ? 0.7 : 0.56}" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${footage ? 0.18 : dark ? 0.3 : 0.18}"/></radialGradient></defs>`
    + `<rect width="100%" height="100%" fill="url(#v)"/></svg>`;

  const clips = {
    ...(background ? { look_bg: { type: "Image", name: "look-bg", src: svgUrl(bgSvg), timing, transform: tf(0, 0, bw, bh, 1), animations: [drift] } } : {}),
    ...(footage ? {} : { look_tint: { type: "Image", name: "look-tint", src: svgUrl(tintSvg), timing, transform: tf(0, 0, W, H, 90, dark ? 0.06 : 0.03) } }),
    ...(grain ? { look_grain: { type: "Image", name: "look-grain", src: svgUrl(grainSvg), timing, transform: tf(0, 0, gw, gh, 95, dark ? 0.05 : 0.035), animations: [grainAnim] } } : {}),
    look_vignette: { type: "Image", name: "look-vignette", src: svgUrl(vigSvg), timing, transform: tf(0, 0, W, H, 99) },
  };
  const trackOf = { look_bg: "look_bg", look_tint: "look_tint", look_grain: "look_grain", look_vignette: "look_vignette" };
  return { clips, trackOf };
}

/**
 * 단어 타이밍 → 자막 페이지 (Q15). words: [{ text, start, end }] (초, 광고 시작 기준, TTS/ASR 결과).
 * 페이지마다 Caption 클립의 timing과 caption.words(페이지 기준 ms)를 돌려준다.
 */
export function captionPages(words, { maxWords = 3, maxGap = 0.35, maxDur = 1.2, tail = 0.15 } = {}) {
  const pages = [];
  let cur = [];
  const flush = () => { if (cur.length) pages.push(cur); cur = []; };
  for (const w of words) {
    const prev = cur.at(-1);
    if (prev && (cur.length >= maxWords || w.start - prev.end > maxGap || w.end - cur[0].start > maxDur)) flush();
    cur.push(w);
  }
  flush();
  return pages.map((p, i) => {
    const from = p[0].start;
    const next = pages[i + 1]?.[0].start ?? Infinity;
    const to = Math.min(p.at(-1).end + tail, next);
    return {
      timing: { display: { from: us(from), to: us(to) }, duration: us(to - from), playbackRate: 1 },
      words: p.map((w) => ({ text: w.text, from: Math.round((w.start - from) * 1000), to: Math.round((w.end - from) * 1000), ...(w.key ? { isKeyWord: true } : {}) })),
    };
  });
}
