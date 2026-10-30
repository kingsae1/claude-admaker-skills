// project.json 검사: 엔진에 없는 모션·이징·키프레임 키 이름, 클립 타입 제약, 시간 범위
// 사용: node validate.mjs project.json
// 아래 목록은 @admaker/engine 3.0.2 기준. 엔진 버전이 바뀌면 dist/index.d.ts와 대조해 갱신한다.
import fs from "node:fs";

const MOTION_TYPES = new Set(["keyframes", "stagger", "gsapTimeline", "wipe", "circleReveal", "rectExpand", "angleWipe", "starReveal", "centerExpand", "blockReveal", "strokeDraw", "paint", "shake", "countUp", "unfold", "fold"]);
const KEYFRAME_KEYS = new Set(["x", "y", "width", "height", "scale", "scaleX", "scaleY", "opacity", "angle", "blur", "brightness", "mirror", "motionBlur", "rotateX", "rotateY", "perspective", "easing"]);
const EASINGS = new Set(["linear", "none", "slow",
  ...["Quad", "Cubic", "Quart", "Quint", "Sine", "Expo", "Circ", "Back", "Elastic", "Bounce"].flatMap((n) => [`easeIn${n}`, `easeOut${n}`, `easeInOut${n}`])]);
const isGsapEase = (e) => /^(power[0-4]|sine|expo|circ|back|elastic|bounce|quad|cubic|quart|quint)\.(in|out|inOut)/.test(e);
const SHAPE_ONLY = new Set(["strokeDraw", "paint"]);

const file = process.argv[2] ?? "project.json";
const p = JSON.parse(fs.readFileSync(file, "utf8"));
const issues = [];
const err = (id, m) => issues.push(`✗ ${id}: ${m}`);
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
  if (c.type === "Adapter" && c.adapter === "script" && !c.params?.name) err(id, "script 어댑터에 params.name 없음");
}

console.log(issues.length ? issues.join("\n") : "✓ 검사 통과");
process.exit(issues.length ? 1 : 0);
