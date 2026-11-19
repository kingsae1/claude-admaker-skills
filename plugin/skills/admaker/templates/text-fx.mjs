// 텍스트 애니메이션 20종 — 글자 하나(한 줄 문구)를 주면 그 효과의 엔진 ProjectJSON 클립 묶음을 돌려준다.
// 순수 모듈(파일·네트워크·Buffer 없음): 앱 MCP text_fx 도구가 그대로 복사해 쓴다(scripts/sync-skill-mcp.mjs).
// 가이드: references/text-animations.md. 엔진 3.0.33+ 모션(scramble·typewrite·charWave)과 프리셋(focus_in·blur_drop)은 엔진 PR #89.
//
// 사용:
//   import { textFx, TEXT_FX } from "./text-fx.mjs";
//   const { clips, tracks, notes } = textFx("liquid-fill", { text: "FILL", box: { x: 90, y: 820, width: 900, height: 260 },
//     style: { ...fontStyle(brand.fonts.display), fontSize: 220 }, color: "#111111", accent: "#F5E400", startSec: 1, endSec: 4 });
//   clips → ProjectJSON clips에 넣고, tracks(앞 = 위) 순서대로 트랙을 만든다.

const us = (s) => Math.round(s * 1e6);
const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

/** 효과 목록 — id, 영상 속 이름, 한 줄 설명, 앱 불러오기에서 그대로 보이는지, 필요한 엔진 */
export const TEXT_FX = [
  { id: "typewriter", name: "Typewriter", label: "타자 + 깜빡이는 커서", engine: "3.0.33", app: true },
  { id: "fade-up", name: "Fade Up", label: "단어가 아래에서 떠오르고 밑줄이 그어짐", app: true },
  { id: "blur-in", name: "Blur In", label: "벌어진 흐린 글자가 모이며 또렷해짐(focus_in)", engine: "3.0.33", app: true },
  { id: "tracking-expand", name: "Tracking Expand", label: "자간이 벌어지고 밑줄이 가운데서 퍼짐", app: true },
  { id: "marker-highlight", name: "Marker Highlight", label: "형광펜 띠가 왼쪽부터 칠해짐", app: true },
  { id: "word-stagger", name: "Word Stagger", label: "단어가 차례로 오르고 마지막 단어에 박스가 팝", app: true },
  { id: "count-up", name: "Number Count-up", label: "숫자가 오르고 끝에 + 가 강조색으로 튐", app: true },
  { id: "scramble", name: "Scramble Decode", label: "무작위 글자가 원래 글자로 해독됨", engine: "3.0.33", app: true },
  { id: "rgb-glitch", name: "RGB Glitch", label: "빨강·청록 잔상이 어긋나며 떨리다 맞춰짐", app: true },
  { id: "letter-flip", name: "Letter Flip", label: "글자가 가로축으로 뒤집혀 섬(flip_in_x)", app: true },
  { id: "sine-wave", name: "Sine Wave", label: "글자가 물결을 따라 계속 오르내림", engine: "3.0.33", app: true },
  { id: "split-reveal", name: "Split Reveal", label: "글자가 위아래로 갈라지고 사이에 라벨이 나옴", app: true },
  { id: "depth-extrude", name: "3D Extrude", label: "입체 두께가 자라며 글자가 떠오름", app: false },
  { id: "liquid-fill", name: "Liquid Fill", label: "윤곽 글자 안에 물결 친 액체가 차오름", app: true },
  { id: "decode-marker", name: "Decode Marker", label: "해독된 뒤 박스가 칠해지며 글자 색이 반전", engine: "3.0.33", app: true },
  { id: "blur-bounce", name: "Blur Bounce", label: "흐린 글자가 기울어 떨어져 튀며 자리잡음(blur_drop)", engine: "3.0.33", app: true },
  { id: "zoom-shake", name: "Zoom Shake", label: "거대한 흐린 글자가 쾅 박히고 충격 링·흔들림", app: true },
  { id: "strike-swap", name: "Strike Rotate", label: "취소선이 그어지고 단어가 굴러 올라가 새 단어로 바뀜", app: true },
  { id: "rise-squiggle", name: "Rise Squiggle", label: "글자가 솟고 물결 밑줄이 그려짐", app: true },
  { id: "outline-extrude", name: "Outline Extrude", label: "윤곽선 글자가 채워지며 입체 두께가 생김", app: false },
];

/** 글자 폭 대략값(em) — 측정값(ink)이 없을 때만 쓴다 */
function emWidth(ch) {
  if (/\s/.test(ch)) return 0.28;
  if (/[가-힣ㄱ-ㆎ]/.test(ch)) return 0.95;
  if (/[MWmw@%]/.test(ch)) return 0.86;
  if (/[A-Z]/.test(ch)) return 0.68;
  if (/[il.,:;'!|]/.test(ch)) return 0.28;
  if (/[a-z0-9]/.test(ch)) return 0.56;
  return 0.5;
}
/** 문구의 대략 폭(px) */
export function estimateWidth(text, fontSize, letterSpacing = 0) {
  const glyphs = Array.from(String(text));
  return glyphs.reduce((w, ch) => w + emWidth(ch) * fontSize, 0) + Math.max(0, glyphs.length - 1) * letterSpacing;
}

/**
 * 글자가 실제로 그려진 범위(캔버스 px). 앱 MCP는 measure_text_range로 잰 값을 o.ink로 넘기고,
 * 없으면 box 가운데 정렬 기준으로 어림한다(대문자 높이 ≈ 0.72em).
 */
export function inkBox(o) {
  if (o.ink) return o.ink;
  const fs = o.style.fontSize;
  const w = Math.min(o.box.width, estimateWidth(o.text, fs, o.style.letterSpacing ?? 0));
  const h = fs * 0.72;
  const align = o.style.align ?? "center";
  const x = align === "left" ? o.box.x : align === "right" ? o.box.x + o.box.width - w : o.box.x + (o.box.width - w) / 2;
  return { x: r1(x), y: r1(o.box.y + (o.box.height - h) / 2), width: r1(w), height: r1(h) };
}

// ── 클립 만들기 ─────────────────────────────────────────────
function clip(o, suffix, type, from, to, transform, rest = {}) {
  const id = `${o.id}_${suffix}`;
  return {
    id, name: id, type,
    timing: { display: { from: us(from), to: us(to) }, duration: us(to - from), playbackRate: 1 },
    transform: { angle: 0, opacity: 1, ...transform },
    animations: [],
    ...rest,
  };
}
const textClip = (o, suffix, str, from, to, box, style) =>
  clip(o, suffix, "Text", from, to, { ...box }, { text: str, style: { align: "center", verticalAlign: "center", ...o.style, ...style } });
const shapeClip = (o, suffix, shapeType, from, to, box, style) => clip(o, suffix, "Shape", from, to, { ...box }, { src: "shape", shapeType, style });

/**
 * 초 단위 정지점 → keyframes. 클립 시작부터 끝까지 한 애니메이션으로 덮는다(엔진은 delay 전에 keyframes를 적용하지 않으므로
 * 늦게 시작하는 입장도 0%를 붙잡아 둔다). stops: [[초, { 키: 값 }, 이징?], …] (이징은 그 정지점 → 다음 정지점)
 */
function keys(from, to, stops, type = "keyframes") {
  const d = Math.max(1e-6, to - from);
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  const all = new Set(sorted.flatMap(([, v]) => Object.keys(v)));
  const last = {};
  const params = {};
  if (sorted[0][0] > from + 1e-6) sorted.unshift([from, { ...sorted[0][1] }]);
  if (sorted.at(-1)[0] < to - 1e-6) sorted.push([to, {}]);
  for (const [t, v, easing] of sorted) {
    Object.assign(last, v);
    const stop = {};
    for (const k of all) if (k in last) stop[k] = last[k];
    params[`${r3(Math.min(100, Math.max(0, ((t - from) / d) * 100)))}%`] = easing ? { ...stop, easing } : stop;
  }
  return { type, options: { duration: us(d), delay: 0, easing: "linear" }, params };
}
const paintKeys = (from, to, stops) => keys(from, to, stops, "paint");
const motion = (type, startSec, durSec, clipFrom, params, easing = "linear") => ({ type, options: { duration: us(durSec), delay: us(Math.max(0, startSec - clipFrom)), easing }, params });
const charAnim = (type, extra = {}) => ({ type, ...extra });

/** 화면 비율 색 대비용: 글자색과 반대 쪽 색 */
const DARK = "#111111";

// ── 효과 ────────────────────────────────────────────────────
const FX = {
  typewriter(o) {
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { align: o.style.align ?? "center" });
    const typeSec = o.typeSec ?? Math.min(2.2, 0.06 * Array.from(o.text).length + 0.3);
    t.animations.push(motion("typewrite", o.startSec, typeSec, o.startSec, { caret: o.caret ?? "|", blink: 0.9 }));
    return { clips: [t], notes: ["가운데 정렬이면 줄이 커지며 가운데를 유지(영상과 같음). 커서 위치를 고정하려면 style.align: 'left'."] };
  },

  "fade-up"(o, ink) {
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { characterAnimation: [charAnim("rise", { duration: 0.6, stagger: 0.08, staggerMode: "word", easing: "expo.out" })] });
    const lineY = ink.y + ink.height + o.style.fontSize * 0.14;
    const th = Math.max(4, Math.round(o.style.fontSize * 0.06));
    const u = shapeClip(o, "underline", "rectangle", o.startSec, o.endSec, { x: ink.x, y: r1(lineY), width: ink.width, height: th }, { fill: o.accent });
    const s = o.startSec + 0.45;
    u.animations.push(keys(o.startSec, o.endSec, [[s, { scaleX: 0, x: -ink.width / 2 }, "expo.out"], [s + 0.5, { scaleX: 1, x: 0 }]]));
    return { clips: [u, t] };
  },

  "blur-in"(o) {
    return { clips: [textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { characterAnimation: [charAnim("focus_in")] })] };
  },

  "tracking-expand"(o, ink) {
    const fs = o.style.fontSize;
    const wide = o.tracking ?? r1(fs * 0.32);
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, {});
    t.animations.push(paintKeys(o.startSec, o.endSec, [[o.startSec, { letterSpacing: -fs * 0.04 }, "expo.out"], [o.startSec + 1.1, { letterSpacing: wide }]]));
    t.animations.push(keys(o.startSec, o.endSec, [[o.startSec, { opacity: 0, blur: 6 }, "power2.out"], [o.startSec + 0.4, { opacity: 1, blur: 0 }]]));
    const n = Math.max(1, Array.from(o.text).length - 1);
    const wFinal = Math.min(o.box.width, ink.width + n * wide);
    const th = Math.max(4, Math.round(fs * 0.05));
    const u = shapeClip(o, "underline", "rectangle", o.startSec, o.endSec,
      { x: r1(ink.x + ink.width / 2 - wFinal / 2), y: r1(ink.y + ink.height + fs * 0.18), width: r1(wFinal), height: th }, { fill: o.accent });
    u.animations.push(keys(o.startSec, o.endSec, [[o.startSec + 0.25, { scaleX: 0 }, "expo.out"], [o.startSec + 1.15, { scaleX: 1 }]]));
    return { clips: [u, t], notes: ["box.width는 벌어진 뒤 폭(글자 수 × tracking)보다 넓게 둡니다."] };
  },

  "marker-highlight"(o, ink) {
    const fs = o.style.fontSize;
    const pad = fs * 0.12;
    const w0 = o.startSec + 0.15; // 마스크(wipe)는 delay 전에 적용되지 않으므로 클립을 그 시각에 시작한다
    const m = shapeClip(o, "marker", "rectangle", w0, o.endSec,
      { x: r1(ink.x - pad), y: r1(ink.y - pad * 0.6), width: r1(ink.width + pad * 2), height: r1(ink.height + pad * 1.2) }, { fill: o.accent, borderRadius: Math.round(fs * 0.06) });
    m.animations.push(keys(w0, o.endSec, [[w0, { skewX: -10 }], [o.endSec, { skewX: -10 }]]));
    m.animations.push(motion("wipe", w0, 0.55, w0, { direction: "right" }, "power3.inOut"));
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { color: o.color ?? DARK });
    t.animations.push(keys(o.startSec, o.endSec, [[o.startSec, { opacity: 0, y: fs * 0.2 }, "expo.out"], [o.startSec + 0.4, { opacity: 1, y: 0 }]]));
    return { clips: [t, m], notes: ["wipe direction 'right' = 왼쪽부터 오른쪽으로 드러남. 형광펜 느낌을 더 내려면 marker style.blendMode: 'multiply'(밝은 바탕에서)."] };
  },

  "word-stagger"(o, ink) {
    const fs = o.style.fontSize;
    const words = o.text.trim().split(/\s+/);
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { characterAnimation: [charAnim("rise", { duration: 0.55, stagger: 0.16, staggerMode: "word", easing: "back.out(1.8)" })] });
    const lastW = o.lastWordInk?.width ?? estimateWidth(words.at(-1), fs);
    const lastX = o.lastWordInk?.x ?? ink.x + ink.width - lastW;
    const pad = fs * 0.14;
    const popAt = o.startSec + 0.16 * (words.length - 1) + 0.35;
    const pill = shapeClip(o, "pill", "rectangle", o.startSec, o.endSec,
      { x: r1(lastX - pad), y: r1(ink.y - pad), width: r1(lastW + pad * 2), height: r1(ink.height + pad * 2) }, { fill: o.accent, borderRadius: Math.round(fs * 0.12) });
    pill.animations.push(keys(o.startSec, o.endSec, [[popAt, { scale: 0, angle: -6 }, "back.out(2.4)"], [popAt + 0.4, { scale: 1, angle: -2 }]]));
    pill.animations.push(keys(o.startSec, o.endSec, [[popAt, { opacity: 0 }, "linear"], [popAt + 0.08, { opacity: 1 }]]));
    return { clips: [t, pill], notes: ["마지막 단어 위치가 어긋나면 measure_text_range로 잰 범위를 lastWordInk로 넘깁니다."] };
  },

  "count-up"(o, ink) {
    const fs = o.style.fontSize;
    const countSec = o.countSec ?? 1.4;
    const t = textClip(o, "number", o.text, o.startSec, o.endSec, o.box, {});
    t.animations.push(motion("countUp", o.startSec, countSec, o.startSec, { from: o.from ?? 0 }, "expo.out"));
    const clips = [t];
    if (o.suffix) {
      const sw = estimateWidth(o.suffix, fs) + fs * 0.2;
      const s = textClip(o, "suffix", o.suffix, o.startSec, o.endSec, { x: r1(ink.x + ink.width + fs * 0.04), y: o.box.y, width: r1(sw), height: o.box.height }, { color: o.accent, align: "left" });
      const at = o.startSec + countSec - 0.05;
      s.animations.push(keys(o.startSec, o.endSec, [[at, { scale: 0, opacity: 0, angle: -20 }, "back.out(3)"], [at + 0.35, { scale: 1, opacity: 1, angle: 0 }]]));
      clips.push(s);
    }
    if (o.label) {
      const l = textClip(o, "label", o.label, o.startSec, o.endSec, { x: o.box.x, y: r1(ink.y + ink.height + fs * 0.12), width: o.box.width, height: r1(fs * 0.4) }, { fontSize: Math.round(fs * 0.22), color: o.labelColor ?? "#9A9A9A", letterSpacing: Math.round(fs * 0.05) });
      clips.push(l);
    }
    return { clips, notes: ["숫자 폭이 세는 동안 바뀌므로 숫자 클립은 오른쪽 정렬(style.align: 'right')로 두면 + 가 안 움직입니다. 기본은 끝 값 기준 위치."] };
  },

  scramble(o) {
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, {});
    t.animations.push(motion("scramble", o.startSec, o.scrambleSec ?? 1.2, o.startSec, { reveal: o.reveal ?? "forward", rate: 18, ...(o.chars ? { chars: o.chars } : {}) }));
    if (o.accent) t.animations.push(paintKeys(o.startSec, o.endSec, [[o.startSec, { color: o.style.color ?? "#FFFFFF" }], [o.startSec + (o.scrambleSec ?? 1.2) * 0.7, { color: o.style.color ?? "#FFFFFF" }, "power2.out"], [o.startSec + (o.scrambleSec ?? 1.2), { color: o.accent }]]));
    return { clips: [t] };
  },

  "rgb-glitch"(o) {
    const fs = o.style.fontSize;
    const a = o.startSec, g = o.glitchSec ?? 0.6;
    const ghost = (suffix, color, dx) => {
      const c = textClip(o, suffix, o.text, o.startSec, o.endSec, o.box, { color });
      c.style.blendMode = "screen";
      const j = (k) => r1(dx * fs * k);
      c.animations.push(keys(o.startSec, o.endSec, [
        [a, { x: j(0.14), y: 0, opacity: 0.9 }, "steps(1)"], [a + g * 0.2, { x: j(-0.09), y: j(0.03) }, "steps(1)"], [a + g * 0.4, { x: j(0.11), y: j(-0.04) }, "steps(1)"],
        [a + g * 0.6, { x: j(-0.05), y: 0 }, "steps(1)"], [a + g * 0.8, { x: j(0.03) }, "power2.out"], [a + g, { x: 0, opacity: 0 }]]));
      return c;
    };
    const main = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, {});
    main.animations.push(keys(o.startSec, o.endSec, [[a, { x: 0, skewX: 0, opacity: 0 }, "steps(1)"], [a + 0.04, { opacity: 1, x: r1(fs * 0.05), skewX: -8 }, "steps(1)"], [a + g * 0.35, { x: r1(-fs * 0.04), skewX: 6 }, "steps(1)"], [a + g * 0.7, { x: 0, skewX: 0 }]]));
    return { clips: [main, ghost("cyan", "#00E5FF", -1), ghost("red", "#FF2D55", 1)], notes: ["어두운 바탕용(screen). 밝은 바탕이면 ghost blendMode를 'multiply'로."] };
  },

  "letter-flip"(o) {
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { characterAnimation: [charAnim("flip_in_x", { duration: 0.6, stagger: 0.07 })], charPerspective: 600 });
    return { clips: [t] };
  },

  "sine-wave"(o) {
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, {});
    t.animations.push(keys(o.startSec, o.endSec, [[o.startSec, { opacity: 0 }, "linear"], [o.startSec + 0.25, { opacity: 1 }]]));
    t.animations.push(motion("charWave", o.startSec, o.endSec - o.startSec, o.startSec, { amplitude: r1(o.style.fontSize * (o.amplitude ?? 0.16)), period: o.period ?? 1.1, wavelength: o.wavelength ?? 5, rotate: o.rotate ?? 8 }));
    return { clips: [t] };
  },

  "split-reveal"(o, ink) {
    const fs = o.style.fontSize;
    const gap = o.gap ?? r1(fs * 0.42);
    const mid = ink.y + ink.height / 2;
    const a = o.startSec + (o.holdSec ?? 0.5);
    const big = 4000;
    const half = (suffix, top) => {
      const dy = top ? -gap / 2 : gap / 2;
      const matte = shapeClip(o, `${suffix}_m`, "rectangle", o.startSec, o.endSec,
        top ? { x: o.box.x - 200, y: r1(mid - big), width: o.box.width + 400, height: big } : { x: o.box.x - 200, y: r1(mid), width: o.box.width + 400, height: big }, { fill: "#FFFFFF" });
      const t = textClip(o, suffix, o.text, o.startSec, o.endSec, o.box, {});
      t.style.matte = { clipId: matte.id, mode: "alpha", hideSource: true };
      const mv = keys(o.startSec, o.endSec, [[a, { y: 0, x: 0 }, "expo.inOut"], [a + 0.55, { y: dy, x: top ? -fs * 0.03 : fs * 0.03 }]]);
      t.animations.push(mv);
      matte.animations.push(JSON.parse(JSON.stringify(mv)));
      return [t, matte];
    };
    const label = o.label ?? "REVEAL";
    const lfs = Math.round(Math.min(gap * 0.55, fs * 0.2));
    const lw = estimateWidth(label, lfs, lfs * 0.25) + lfs * 1.4;
    const tag = shapeClip(o, "tag", "rectangle", o.startSec, o.endSec, { x: r1(ink.x + ink.width / 2 - lw / 2), y: r1(mid - lfs * 0.75), width: r1(lw), height: r1(lfs * 1.5) }, { fill: o.accent, borderRadius: Math.round(lfs * 0.3) });
    const tagText = textClip(o, "tag_text", label, o.startSec, o.endSec, tag.transform, { fontSize: lfs, color: o.labelColor ?? DARK, letterSpacing: Math.round(lfs * 0.25) });
    const pop = keys(o.startSec, o.endSec, [[a + 0.2, { scaleX: 0 }, "back.out(1.6)"], [a + 0.6, { scaleX: 1 }]]);
    const show = keys(o.startSec, o.endSec, [[a + 0.2, { opacity: 0 }, "linear"], [a + 0.3, { opacity: 1 }]]);
    tag.animations.push(pop, show);
    tagText.animations.push(JSON.parse(JSON.stringify(pop)), JSON.parse(JSON.stringify(show)));
    const [topT, topM] = half("top", true);
    const [botT, botM] = half("bottom", false);
    return { clips: [tagText, tag, topT, botT, topM, botM], notes: ["매트 사각형(_m)은 글자와 같이 움직여 반쪽만 보입니다. 앱 불러오기에서 매트는 transform.matte로 넘어갑니다."] };
  },

  "depth-extrude"(o) {
    const fs = o.style.fontSize;
    const depth = o.depth ?? Math.round(Math.min(48, fs * 0.16));
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { extrude: { depth, angle: o.angle ?? 60, color: o.depthColor ?? shade(o.style.color ?? "#FFD400", 0.45) } });
    t.animations.push(paintKeys(o.startSec, o.endSec, [[o.startSec, { extrude: 0 }, "expo.out"], [o.startSec + 0.9, { extrude: 1 }]]));
    t.animations.push(keys(o.startSec, o.endSec, [[o.startSec, { opacity: 0, x: r1(depth * 0.5), y: r1(depth * 0.8) }, "expo.out"], [o.startSec + 0.25, { opacity: 1 }], [o.startSec + 0.9, { x: 0, y: 0 }]]));
    return { clips: [t], notes: ["앱 text_segment 렌더러는 extrude를 아직 그리지 않습니다 — 앱에서 고칠 광고면 영상으로 구워 넣습니다."] };
  },

  "liquid-fill"(o, ink) {
    const fs = o.style.fontSize;
    const fillColor = o.color ?? o.style.color ?? DARK;
    const outline = textClip(o, "outline", o.text, o.startSec, o.endSec, o.box, { color: "rgba(0,0,0,0)", stroke: { color: fillColor, width: Math.max(2, Math.round(fs * 0.02)) } });
    // 물결 윗면이 있는 액체 판: 폭은 글자의 2배(가로로 흘러감), 높이는 글자 높이 + 여유
    const W = ink.width * 2 + fs, H = ink.height + fs * 0.9, amp = fs * 0.06, waves = 4;
    let d = `M0 ${r1(amp)}`;
    for (let i = 0; i < waves; i++) {
      const x0 = (W / waves) * i, x1 = x0 + W / waves;
      d += ` Q${r1(x0 + W / waves / 4)} ${r1(-amp)} ${r1(x0 + W / waves / 2)} ${r1(amp)} T${r1(x1)} ${r1(amp)}`;
    }
    d += ` L${r1(W)} ${r1(H)} L0 ${r1(H)} Z`;
    const top0 = ink.y + ink.height + fs * 0.12, top1 = ink.y - fs * 0.2;
    const liquid = shapeClip(o, "liquid", "path", o.startSec, o.endSec, { x: r1(ink.x - fs * 0.5), y: r1(top0), width: r1(W), height: r1(H) }, { path: d, viewBox: [0, -amp, W, H + amp], fill: "#FFFFFF" });
    const fillSec = o.fillSec ?? 1.6;
    liquid.animations.push(keys(o.startSec, o.endSec, [[o.startSec + 0.3, { y: 0, x: 0 }, "power2.inOut"], [o.startSec + 0.3 + fillSec, { y: r1(top1 - top0), x: r1(-ink.width) }], [o.endSec, { y: r1(top1 - top0 - fs * 0.05), x: r1(-ink.width * 1.3) }]]));
    const fill = textClip(o, "fill", o.text, o.startSec, o.endSec, o.box, { color: fillColor });
    fill.style.matte = { clipId: liquid.id, mode: "alpha", hideSource: true };
    return { clips: [fill, outline, liquid], notes: ["fill 글자가 물결 판(liquid) 모양 안에서만 보입니다. 바탕은 accent 단색 등 밝은 색이 잘 보입니다."] };
  },

  "decode-marker"(o, ink) {
    const fs = o.style.fontSize;
    const textColor = o.color ?? o.style.color ?? DARK;
    const inv = o.accent;
    const scr = o.scrambleSec ?? 0.9;
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { color: textColor });
    t.animations.push(motion("scramble", o.startSec, scr, o.startSec, { reveal: "forward", rate: 16 }));
    const pad = fs * 0.12;
    const at = o.startSec + scr + 0.15;
    const box = shapeClip(o, "box", "rectangle", at, o.endSec, { x: r1(ink.x - pad), y: r1(ink.y - pad), width: r1(ink.width + pad * 2), height: r1(ink.height + pad * 2) }, { fill: textColor });
    box.animations.push(keys(at, o.endSec, [[at, { skewX: -12 }], [o.endSec, { skewX: -12 }]]));
    box.animations.push(motion("wipe", at, 0.45, at, { direction: "right" }, "power3.inOut"));
    const caret = shapeClip(o, "caret", "rectangle", o.startSec, o.endSec, { x: r1(ink.x - pad), y: r1(ink.y - pad), width: Math.max(4, Math.round(fs * 0.04)), height: r1(ink.height + pad * 2) }, { fill: textColor });
    caret.animations.push(keys(o.startSec, o.endSec, [[o.startSec, { opacity: 0 }, "steps(1)"], [at - 0.15, { opacity: 1 }, "steps(1)"], [at, { opacity: 0 }]]));
    const over = textClip(o, "inverse", o.text, at, o.endSec, o.box, { color: inv });
    over.style.matte = { clipId: box.id, mode: "alpha", hideSource: false };
    return { clips: [over, caret, box, t], notes: ["inverse(강조색 글자)는 박스 모양 안에서만 보여 박스가 칠해지는 곳의 글자 색이 반전됩니다."] };
  },

  "blur-bounce"(o) {
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { characterAnimation: [charAnim("blur_drop")] });
    return { clips: [t] };
  },

  "zoom-shake"(o, ink) {
    const fs = o.style.fontSize;
    const a = o.startSec, hit = a + (o.slamSec ?? 0.28);
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, {});
    t.animations.push(keys(o.startSec, o.endSec, [[a, { scale: 3.4, blur: 26, opacity: 0 }, "expo.in"], [a + 0.06, { opacity: 1 }], [hit, { scale: 1, blur: 0 }]]));
    t.animations.push(motion("shake", hit, 0.45, o.startSec, { x: r1(fs * 0.06), y: r1(fs * 0.04), angle: 1.5, frequency: 22 }));
    const R = Math.max(ink.width, ink.height) * 0.55;
    const ring = shapeClip(o, "ring", "circle", o.startSec, o.endSec, { x: r1(ink.x + ink.width / 2 - R), y: r1(ink.y + ink.height / 2 - R), width: r1(R * 2), height: r1(R * 2) },
      { fill: "rgba(0,0,0,0)", stroke: { color: o.ringColor ?? o.style.color ?? DARK, width: Math.max(4, Math.round(fs * 0.045)) } });
    ring.animations.push(keys(o.startSec, o.endSec, [[hit, { scale: 0.35, opacity: 0 }, "steps(1)"], [hit + 0.01, { opacity: 0.9 }, "expo.out"], [hit + 0.7, { scale: 2.1, opacity: 0 }]]));
    return { clips: [t, ring], notes: ["쾅 박히는 시각(startSec + slamSec)을 박·효과음 피크에 맞춥니다."] };
  },

  "strike-swap"(o, ink) {
    const fs = o.style.fontSize;
    const next = o.next ?? o.text;
    const a = o.startSec, cut = a + (o.swapSec ?? 1.1);
    const old = textClip(o, "old", o.text, o.startSec, Math.min(o.endSec, cut + 0.5), o.box, { color: o.oldColor ?? "#8E8E8E" });
    const roll = { perspective: 700 };
    old.animations.push(keys(old.timing.display.from / 1e6, old.timing.display.to / 1e6, [[a, { opacity: 0, y: r1(fs * 0.25), ...roll }, "expo.out"], [a + 0.35, { opacity: 1, y: 0 }], [cut, { y: 0, rotateX: 0, opacity: 1 }, "power3.in"], [cut + 0.35, { y: r1(-fs * 0.7), rotateX: 85, opacity: 0 }]]));
    const line = shapeClip(o, "strike", "rectangle", o.startSec, Math.min(o.endSec, cut + 0.5), { x: r1(ink.x - fs * 0.06), y: r1(ink.y + ink.height * 0.52), width: r1(ink.width + fs * 0.12), height: Math.max(4, Math.round(fs * 0.07)) }, { fill: o.accent });
    line.animations.push(keys(old.timing.display.from / 1e6, old.timing.display.to / 1e6, [[a + 0.35, { scaleX: 0, x: r1(-(ink.width + fs * 0.12) / 2), angle: -3 }, "expo.out"], [a + 0.75, { scaleX: 1, x: 0 }], [cut, { y: 0, opacity: 1 }, "power3.in"], [cut + 0.35, { y: r1(-fs * 0.7), opacity: 0 }]]));
    const nu = textClip(o, "new", next, cut, o.endSec, o.box, { color: o.accent });
    nu.animations.push(keys(cut, o.endSec, [[cut, { y: r1(fs * 0.7), rotateX: -85, opacity: 0, ...roll }, "expo.out"], [cut + 0.5, { y: 0, rotateX: 0, opacity: 1 }]]));
    return { clips: [nu, line, old], notes: ["next에 바뀔 단어를 줍니다(예: Cheap → Premium). 할인 전·후 가격, 고정관념 → 사실 반전 문구에."] };
  },

  "rise-squiggle"(o, ink) {
    const fs = o.style.fontSize;
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { characterAnimation: [charAnim("rise", { duration: 0.55, stagger: 0.05, staggerMode: "char", easing: "back.out(1.7)" })] });
    const w = ink.width * 0.85, h = fs * 0.16, n = Math.max(3, Math.round(w / (fs * 0.32)));
    let d = `M0 ${r1(h / 2)}`;
    for (let i = 0; i < n; i++) d += ` Q${r1((w / n) * (i + 0.5))} ${i % 2 ? r1(h) : 0} ${r1((w / n) * (i + 1))} ${r1(h / 2)}`;
    const sq = shapeClip(o, "squiggle", "path", o.startSec, o.endSec, { x: r1(ink.x + (ink.width - w) / 2), y: r1(ink.y + ink.height + fs * 0.16), width: r1(w), height: r1(h) },
      { path: d, viewBox: [0, 0, r1(w), r1(h)], fill: "rgba(0,0,0,0)", stroke: { color: o.accent, width: Math.max(3, Math.round(fs * 0.045)), cap: "round" } });
    sq.animations.push({ type: "strokeDraw", options: { duration: us(0.6), delay: 0, easing: "power2.inOut" }, params: { fill: "hidden" } });
    // strokeDraw는 delay 전에도 시작 상태(안 그려짐)를 보여 주므로, 늦게 그리려면 클립 시작을 미룬다
    sq.timing = { display: { from: us(o.startSec + 0.4), to: us(o.endSec) }, duration: us(o.endSec - o.startSec - 0.4), playbackRate: 1 };
    return { clips: [t, sq] };
  },

  "outline-extrude"(o) {
    const fs = o.style.fontSize;
    const color = o.style.color ?? "#FFD400";
    const depth = o.depth ?? Math.round(Math.min(40, fs * 0.12));
    const t = textClip(o, "text", o.text, o.startSec, o.endSec, o.box, { color: "rgba(0,0,0,0)", stroke: { color, width: Math.max(2, Math.round(fs * 0.018)) }, extrude: { depth, angle: o.angle ?? 50, color: o.depthColor ?? shade(color, 0.5) } });
    const a = o.startSec;
    t.animations.push(paintKeys(o.startSec, o.endSec, [[a, { color: "rgba(0,0,0,0)", extrude: 0 }], [a + 0.35, { color: "rgba(0,0,0,0)", extrude: 0 }, "power2.out"], [a + 0.75, { color }, "expo.out"], [a + 1.2, { extrude: 1 }]]));
    t.animations.push(keys(o.startSec, o.endSec, [[a, { opacity: 0, scale: 0.92 }, "expo.out"], [a + 0.35, { opacity: 1, scale: 1 }], [a + 0.75, { x: 0, y: 0 }, "expo.out"], [a + 1.2, { x: r1(-depth * 0.3), y: r1(-depth * 0.5) }]]));
    return { clips: [t], notes: ["앱 text_segment 렌더러는 extrude를 아직 그리지 않습니다(윤곽→채움까지만 보임)."] };
  },
};

/** #RRGGBB를 k(0–1)만큼 어둡게 */
function shade(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return "#222222";
  const n = parseInt(m[1], 16);
  const c = (v) => Math.round(v * (1 - k)).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

/**
 * kind: TEXT_FX의 id. o = { text, box: {x,y,width,height}, style: { fontFamily, fontUrl, fontWeight, fontSize, color, align? },
 *   accent, color?, startSec, endSec, id?(클립 id 앞머리), ink?(측정한 글자 범위), 효과별 옵션 }
 * → { clips(배열 앞 = 위), tracks(위 → 아래 트랙, ProjectJSON tracks 앞쪽부터), notes, fx }
 */
export function textFx(kind, o) {
  const fx = TEXT_FX.find((f) => f.id === kind);
  if (!fx) throw new Error(`모르는 텍스트 효과: ${kind} (가능: ${TEXT_FX.map((f) => f.id).join(", ")})`);
  if (!o?.text || !o.box || !o.style?.fontSize) throw new Error("text, box, style.fontSize가 필요합니다");
  const startSec = o.startSec ?? 0;
  const endSec = o.endSec ?? startSec + 3;
  if (!(endSec > startSec)) throw new Error("endSec > startSec 이어야 합니다");
  const opts = { accent: "#F5E400", ...o, startSec, endSec, id: o.id ?? kind.replace(/-/g, "_") };
  const ink = inkBox(opts);
  const r = FX[kind](opts, ink);
  const tracks = r.clips.map((c) => ({ id: `t_${c.id}`, name: c.id, type: c.type, clipIds: [c.id] }));
  return { clips: r.clips, tracks, notes: r.notes ?? [], fx, ink };
}
