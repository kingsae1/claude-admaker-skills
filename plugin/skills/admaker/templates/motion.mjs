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
  return { type: "keyframes", options: { duration: us(dur), delay: us(delay + index * frames(gap)), easing: "linear" }, params: { "0%": from, "100%": to } };
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

/** 숨쉬기 (Q13): start(초, 클립 기준)부터 clipDur까지 왕복. R1 정지 중인 브랜드 요소에는 쓰지 않는다. */
export function breathe(clipDur, start, { period = 3, scale = 1.015, y = -3 } = {}) {
  const left = clipDur - start;
  if (left < 2) return null;
  return { type: "keyframes",
    options: { duration: us(period), delay: us(start), easing: "linear", iterCount: Math.ceil(left / period), direction: "alternate" },
    params: { "0%": { scale: 1, y: 0, easing: "easeInOutSine" }, "100%": { scale, y } } };
}

/** 모션 블러 (Q14): 가로 이동 keyframes의 stop에 넣을 값. px/프레임 기준 30 이상일 때만. */
export const blurFor = (pxPerFrame) => (Math.abs(pxPerFrame) >= 30 ? Math.min(40, Math.round(Math.abs(pxPerFrame) / 3)) : 0);

/** 세로·대각선 모션 블러 (Q14): clip.effects 항목. start/dur는 클립 기준 초. */
export const motionBlurEffect = (id, start, dur, vy, vx = 0) =>
  ({ id, key: "motionBlurFilter", startTime: us(start), duration: us(dur), values: { velocity: { x: vx, y: vy }, kernelSize: 9 } });

/** 룩 스택 (Q11): 배경·그레이드·그레인·비네트 클립 4–5개. 값은 렌더 검증 전 초기값. */
export function lookStack({ W, H, duration, brand, dark = true }) {
  const c = brand.colors ?? {};
  const full = (z, opacity = 1) => ({ x: 0, y: 0, width: W, height: H, angle: 0, opacity, zIndex: z });
  const timing = { display: { from: 0, to: us(duration) }, duration: us(duration), playbackRate: 1 };
  const hex = (h, a) => h && /^#[0-9a-f]{6}$/i.test(h) ? h + Math.round(a * 255).toString(16).padStart(2, "0") : h;
  const clips = {
    look_bg: { type: "Backdrop", name: "bg", src: "backdrop", backdropType: "meshGradient", timing, transform: full(0),
      style: { backdropType: "meshGradient", colors: [c.background ?? "#0A0A0F", hex(c.primary ?? c.accent, 0.2), hex(c.accent, 0.13)].filter(Boolean), speed: 0.3, scale: 1 } },
    look_grade: { type: "Effect", name: "grade", effectKey: "adjustmentFilter", timing, transform: full(90),
      values: { saturation: 1.1, contrast: 1.08, gamma: 1, brightness: 1, red: 1, green: 1, blue: 1, alpha: 1 } },
    look_tint: { type: "Effect", name: "tint", effectKey: "colorOverlayFilter", timing, transform: full(91),
      values: { color: c.primary ?? c.accent ?? "#000000", alpha: dark ? 0.06 : 0.03 } },
    look_grain: { type: "Backdrop", name: "grain", src: "backdrop", backdropType: "noise", timing, transform: full(95, dark ? 0.05 : 0.035),
      style: { backdropType: "noise", colors: ["#808080"], density: 0.6, speed: 1 } },
    look_vignette: { type: "Effect", name: "vignette", effectKey: "oldFilmFilter", timing, transform: full(99),
      values: { sepia: 0, noise: 0, scratch: 0, vignetting: 0.3, vignettingAlpha: 0.5, vignettingBlur: 0.4 } },
  };
  const trackOf = { look_bg: "look_bg", look_grade: "look_fx", look_tint: "look_fx", look_grain: "look_grain", look_vignette: "look_fx" };
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
