// project.json 검사: 엔진에 없는 모션·이징·키프레임·필터 이름, 클립 타입 제약, src 누락, 시간 범위 (✗ 오류)
// + 모션 규칙 경고: 단독 페이드(R6), 동시 입장(R7) (△ 경고, 종료 코드에 영향 없음)
// 사용: node validate.mjs project.json
// 아래 목록은 @admaker/engine 3.0.5 (three 어댑터 + 씬 훅 포함) 기준. 엔진 버전이 바뀌면 dist/index.d.ts와 대조해 갱신한다.
import fs from "node:fs";

const MOTION_TYPES = new Set(["keyframes", "stagger", "gsapTimeline", "wipe", "circleReveal", "rectExpand", "angleWipe", "starReveal", "centerExpand", "blockReveal", "strokeDraw", "paint", "shake", "countUp", "unfold", "fold"]);
const KEYFRAME_KEYS = new Set(["x", "y", "width", "height", "scale", "scaleX", "scaleY", "opacity", "angle", "blur", "brightness", "mirror", "motionBlur", "rotateX", "rotateY", "perspective", "easing"]);
const EASINGS = new Set(["linear", "none", "slow",
  ...["Quad", "Cubic", "Quart", "Quint", "Sine", "Expo", "Circ", "Back", "Elastic", "Bounce"].flatMap((n) => [`easeIn${n}`, `easeOut${n}`, `easeInOut${n}`])]);
const isGsapEase = (e) => /^(power[0-4]|sine|expo|circ|back|elastic|bounce|quad|cubic|quart|quint)\.(in|out|inOut)/.test(e);
const SHAPE_ONLY = new Set(["strokeDraw", "paint"]);
const FILTERS = new Set(["adjustment", "advancedBloom", "backdropBlur", "bloom", "colorMap", "colorOverlay", "convolution", "dot", "dropShadow", "glitch", "glow", "godray", "grayscale", "hslAdjustment", "kawaseBlur", "motionBlur", "oldFilm", "pixelate", "radialBlur", "reflection", "rgbSplit", "tiltShift"].map((n) => `${n}Filter`));
const BACKDROPS = new Set(["solid", "gradient", "meshGradient", "noise", "floatingBlobs"]);
// Core(Studio 로딩)는 이 타입들만 빈 src를 허용하고 나머지는 클립을 버린다
const SRC_OPTIONAL = new Set(["Text", "Caption", "Effect", "Transition"]);
const FPS = p => p.settings?.fps ?? 30;

const file = process.argv[2] ?? "project.json";
const p = JSON.parse(fs.readFileSync(file, "utf8"));
const issues = [];
const err = (id, m) => issues.push(`✗ ${id}: ${m}`);
const warnings = [];
const warn = (id, m) => warnings.push(`△ ${id}: ${m}`);
const entranceStarts = new Map(); // 입장 시작 프레임 → 클립 id들 (R7)
const dur = p.settings?.duration ?? Infinity;

for (const [id, c] of Object.entries(p.clips ?? {})) {
  const d = c.timing?.display;
  if (!d) err(id, "timing.display 없음");
  else if (d.to > dur) err(id, `프로젝트 길이를 넘음 (${d.to} > ${dur} μs)`);
  for (const a of c.animations ?? []) {
    if (!MOTION_TYPES.has(a.type)) err(id, `모르는 모션 type "${a.type}"`);
    if (SHAPE_ONLY.has(a.type) && c.type !== "Shape") err(id, `${a.type}는 Shape 전용`);
    if (a.type === "countUp" && c.type !== "Text") err(id, "countUp은 Text 전용");
    const e = a.options?.easing;
    if (e && !EASINGS.has(e) && !isGsapEase(e)) err(id, `모르는 easing "${e}" (엔진은 선형으로 처리함)`);
    if (a.type === "keyframes") for (const [stop, v] of Object.entries(a.params ?? {})) {
      for (const k of Object.keys(v)) if (!KEYFRAME_KEYS.has(k)) err(id, `keyframes ${stop}: 모르는 키 "${k}"`);
      if (v.easing && !EASINGS.has(v.easing) && !isGsapEase(v.easing)) err(id, `keyframes ${stop}: 모르는 easing "${v.easing}"`);
    }
  }
  if (!SRC_OPTIONAL.has(c.type) && !(c.src && String(c.src).trim())) err(id, `${c.type}에 src 없음 (Core가 클립을 버림. 절차적 클립은 "backdrop"/"shape"/"script"/"three" 같은 표식 값)`);
  if (c.type === "Effect" && !FILTERS.has(c.effectKey)) err(id, `모르는 Effect 필터 "${c.effectKey}" (이름은 …Filter 형식)`);
  for (const fx of c.effects ?? []) if (!FILTERS.has(fx.key)) err(id, `clip.effects: 모르는 필터 "${fx.key}"`);
  if (c.type === "Backdrop") {
    const bt = c.backdropType ?? c.style?.backdropType ?? "solid";
    if (!BACKDROPS.has(bt)) err(id, `모르는 backdropType "${bt}"`);
  }
  const kfs = (c.animations ?? []).filter((a) => a.type === "keyframes");
  for (const a of kfs) {
    const stops = Object.values(a.params ?? {});
    const first = stops[0] ?? {};
    const moved = Object.keys(first).filter((k) => k !== "easing");
    if (moved.length === 1 && moved[0] === "opacity" && first.opacity === 0) warn(id, "opacity만 바뀌는 단독 페이드 입장 (R6: 위치·scale을 함께)");
    if (first.opacity === 0 && d) {
      const f = Math.round(((d.from + (a.options?.delay ?? 0)) / 1e6) * FPS(p));
      entranceStarts.set(f, [...(entranceStarts.get(f) ?? []), id]);
    }
  }
  if (c.type === "Adapter" && c.adapter === "script" && !c.params?.name) err(id, "script 어댑터에 params.name 없음");
  if (c.type === "Adapter" && c.adapter === "three") {
    const scene = c.params?.scene ?? "model";
    if (scene === "model" && !(c.src || c.params?.src)) err(id, "three model 씬에 src(.glb/.gltf) 없음");
    if (scene !== "model" && !c.src) err(id, "three 커스텀 씬에 src 없음 (비어 있으면 Core가 클립을 버림, 표식 값 \"three\")");
  }
  if (c.type === "Adapter" && !["script", "lottie", "three"].includes(c.adapter)) err(id, `모르는 어댑터 "${c.adapter}"`);
}

for (const [f, ids] of entranceStarts) if (ids.length >= 3) warn(ids.join(", "), `프레임 ${f}에 입장 ${ids.length}개 동시 시작 (R7: 3–6프레임 시차)`);
console.log(issues.length ? issues.join("\n") : "✓ 검사 통과");
if (warnings.length) console.log(warnings.join("\n"));
process.exit(issues.length ? 1 : 0);
