// 노이즈 흔들림(wiggle) — references/shots/wiggle-float.md
// 손으로 든 카메라, 둥둥 떠 있는 제품, 살아 있는 듯한 글자. shake(무작위 떨림)와 달리 부드럽게 이어지는 흔들림.
// 1단계: 시간 t의 1D 그래디언트 노이즈를 fps 간격으로 샘플해 기존 keyframes로 굽는다 → 엔진·앱 공통.
//
//   import { wiggleKeys } from "./noise.mjs";
//   clip.animations.push(wiggleKeys({ seed: 7, freq: 0.6, amp: { x: 10, y: 14, angle: 1.2 }, duration: clipSeconds }));
//
// 노이즈: 정수 격자마다 seed로 정한 기울기 g ∈ [−1, 1]을 두고, 칸 안에서는 양쪽 기울기 직선을
// 5차 smoothstep(6f⁵ − 15f⁴ + 10f³)으로 섞는 1D 펄린(그래디언트) 노이즈. 값 범위 [−1, 1].
// 참고: https://en.wikipedia.org/wiki/Perlin_noise (1D 그래디언트 노이즈·페이드 함수). 코드는 새로 작성.

// 정수 → [0, 1) 해시 (32비트 정수 섞기). 같은 (i, seed)면 언제나 같은 값.
function hash01(i, seed) {
  let h = Math.imul((i | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae3d);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const fade = (f) => f * f * f * (f * (f * 6 - 15) + 10);

/** 1D 그래디언트 노이즈 n(x) ∈ [−1, 1]. 정수 x에서 0, 결정적 */
export function noise1(x, seed = 1) {
  const i = Math.floor(x), f = x - i;
  const g0 = hash01(i, seed) * 2 - 1, g1 = hash01(i + 1, seed) * 2 - 1;
  const a = g0 * f, b = g1 * (f - 1);
  const v = (a + (b - a) * fade(f)) * 2; // 1D 펄린 최대 |0.5| → 2배로 [−1, 1]
  return Math.max(-1, Math.min(1, v));
}

/** 옥타브 합: 주파수 2배·진폭 1/2씩 더하고 진폭 합으로 나눠 [−1, 1] 유지 */
export function fbm1(x, seed = 1, octaves = 1) {
  const n = Math.max(1, Math.min(3, Math.round(octaves)));
  let sum = 0, norm = 0, a = 1, f = 1;
  for (let o = 0; o < n; o++) { sum += a * noise1(x * f + o * 17.31, seed + o * 1013); norm += a; a *= 0.5; f *= 2; }
  return sum / norm;
}

// 속성마다 다른 노이즈 구간을 쓰도록 오프셋을 준다(x·y가 같은 모양으로 움직이지 않게)
const KEY_OFFSET = { x: 0, y: 101.7, angle: 211.3, scale: 337.9 };
export const WIGGLE_KEYS = Object.keys(KEY_OFFSET);

/**
 * 처음·끝 ramp초 동안 진폭을 0 ↔ 1로 (smoothstep). 끝값이 기준값이라 앞뒤 클립과 이음매 없음.
 * 느린 흔들림(freq < 2.5Hz)에서 0.2초 안에 진폭을 다 올리면 그 순간이 툭 튀므로 ramp는 최소 0.5 / freq초.
 */
export const rampSeconds = (ramp, freq) => Math.max(ramp, freq > 0 ? 0.5 / freq : 0);
function envelope(t, duration, ramp, freq) {
  if (!(ramp > 0)) return 1;
  const r = Math.min(rampSeconds(ramp, freq), duration / 2);
  const s = (u) => { const c = Math.max(0, Math.min(1, u)); return c * c * (3 - 2 * c); };
  return Math.min(s(t / r), s((duration - t) / r));
}

/**
 * 시간 t(초)의 흔들림 값. 2단계 엔진 모션과 같은 계산(스킬 굽기와 엔진이 같은 결과를 내도록 이 식이 기준).
 * 반환: { x?, y?, angle? } 오프셋(px·도)과 scale(곱하는 값). amp에 없는 속성은 빠짐.
 */
export function wiggleAt(t, { seed = 1, freq = 1, amp = {}, octaves = 1, duration = Infinity, ease = true, ramp = 0.2 } = {}) {
  const out = {};
  const env = ease && Number.isFinite(duration) ? envelope(t, duration, ramp, freq) : 1;
  for (const k of WIGGLE_KEYS) {
    const a = Number(amp[k]);
    if (!Number.isFinite(a) || a === 0) continue;
    const n = freq > 0 ? fbm1(t * freq + KEY_OFFSET[k], seed, octaves) * env : 0;
    out[k] = k === "scale" ? 1 + n * a : n * a;
  }
  return out;
}

const r4 = (v) => Math.round(v * 1e4) / 1e4;

/**
 * 흔들림을 keyframes로 굽는다(클립 전체 길이). 같은 seed면 같은 결과.
 * @param {object} o
 * @param {number} [o.seed=1]     장면·클립마다 바꾼다
 * @param {number} [o.freq=1]     초당 흔들림 수(Hz). 떠 있는 제품 0.3–0.6, 핸드헬드 0.8–1.5, 살아 있는 글자 1.5–3. 0 이하면 정지
 * @param {object} o.amp          { x: px, y: px, angle: 도, scale: 비율 } — 없는 속성은 건너뜀
 * @param {number} o.duration     클립 길이(초)
 * @param {number} [o.fps=30]     샘플 간격. 사이는 직선 보간
 * @param {number} [o.octaves=1]  1–3. 2면 잔떨림이 섞인 핸드헬드
 * @param {boolean} [o.ease=true] 처음·끝 ramp초(최소 0.5 / freq) 진폭을 0에서 올리고 내림
 * @param {number} [o.ramp=0.2]
 * @param {number} [o.delay=0]    클립 시작 후 몇 초부터(그 전은 정지). 흔들림은 항등값에서 시작하므로 delay를 써도 됨
 * @returns keyframes 애니메이션 { type: "keyframes", options, params }
 */
export function wiggleKeys({ seed = 1, freq = 1, amp = {}, duration, fps = 30, octaves = 1, ease = true, ramp = 0.2, delay = 0 } = {}) {
  if (!(duration > 0)) throw new Error("wiggleKeys: duration(초)이 필요합니다");
  const keys = WIGGLE_KEYS.filter((k) => Number.isFinite(Number(amp[k])) && Number(amp[k]) !== 0);
  const steps = freq > 0 && keys.length ? Math.max(1, Math.ceil(duration * fps)) : 1;
  const params = {};
  for (let i = 0; i <= steps; i++) {
    const t = Math.min(duration, i / fps);
    const v = freq > 0 ? wiggleAt(t, { seed, freq, amp, octaves, duration, ease, ramp }) : Object.fromEntries(keys.map((k) => [k, k === "scale" ? 1 : 0]));
    const stop = {};
    for (const k of keys) stop[k] = r4(v[k]);
    params[`${+((t / duration) * 100).toFixed(4)}%`] = stop;
  }
  return { type: "keyframes", options: { duration: Math.round(duration * 1e6), delay: Math.round(delay * 1e6), easing: "linear" }, params };
}

/** keyframes params → [{ t(초), ...값 }] (검사·그래프용) */
export function sampleKeys(anim) {
  const d = anim.options.duration / 1e6;
  return Object.entries(anim.params).map(([p, v]) => ({ t: (parseFloat(p) / 100) * d, ...v })).sort((a, b) => a.t - b.t);
}
