// project.json 검사: 엔진에 없는 모션·이징·키프레임·필터 이름, 클립 타입 제약, src 누락, 시간 범위 (✗ 오류)
// + 모션 규칙 경고: 단독 페이드(R6), 동시 입장(R7), 바닥 소재 없음·소재를 넓게 덮는 층(Q11), 움직이는 층이 모자란 구간(F2) (△ 경고, 종료 코드에 영향 없음)
// 사용: node validate.mjs project.json
// 아래 목록은 @admaker/engine 3.0.7 (three 어댑터 + 씬 훅, gsap-core 3.15, lineBoil) 기준. 엔진 버전이 바뀌면 dist/index.d.ts와 대조해 갱신한다.
import fs from "node:fs";
import { FONTS, findFont, hasHangul } from "./fonts.mjs";
import { appTransitionWindow, autoZSign, checkSeams, sampleClip } from "./seams.mjs";

const MOTION_TYPES = new Set(["keyframes", "stagger", "gsapTimeline", "wipe", "circleReveal", "rectExpand", "angleWipe", "starReveal", "centerExpand", "blockReveal", "strokeDraw", "paint", "shake", "countUp", "lineBoil", "unfold", "fold"]);
const KEYFRAME_KEYS = new Set(["x", "y", "width", "height", "scale", "scaleX", "scaleY", "opacity", "angle", "blur", "brightness", "mirror", "motionBlur", "rotateX", "rotateY", "z", "perspective", "easing"]);
const EASINGS = new Set(["linear", "none", "slow",
  ...["Quad", "Cubic", "Quart", "Quint", "Sine", "Expo", "Circ", "Back", "Elastic", "Bounce"].flatMap((n) => [`easeIn${n}`, `easeOut${n}`, `easeInOut${n}`])]);
// gsap-core가 아는 이징: 이름(방향 생략 = .out), 설정값 "back.out(1.7)", "steps(6)". CustomEase·EasePack(rough, slow(…), expoScale)은 등록 안 됨
const isGsapEase = (e) => /^(power[0-4]|sine|expo|circ|back|elastic|bounce|quad|cubic|quart|quint|strong|linear)(\.(in|out|inOut))?(\([\d.,\s-]*\))?$/.test(e) || /^steps\(\d+\)$/.test(e);
const GSAP_PROPS = new Set(["x", "y", "scale", "scaleX", "scaleY", "angle", "opacity", "blur", "brightness", "rotateX", "rotateY"]);
// 엔진 gsapTimeline이 받는 position: 숫자, "<", ">", "<0.2", "+=0.5", "-=0.2" (라벨 없음)
const GSAP_POSITION = /^(?:[<>](?:(?:[+-]=)?-?\d*\.?\d+)?|[+-]=\d*\.?\d+)$/;
function checkGsapTimeline(id, a) {
  const tweens = a.params?.tweens;
  if (!Array.isArray(tweens) || !tweens.length) return err(id, "gsapTimeline: params.tweens가 비어 있음");
  if (tweens.length > 200) err(id, `gsapTimeline: tween ${tweens.length}개 (엔진은 앞 200개만 씀)`);
  tweens.forEach((t, i) => {
    const at = `gsapTimeline tweens[${i}]`;
    if (!t?.to || !Object.keys(t.to).length) err(id, `${at}: to 없음 (from만 있으면 엔진이 tween을 버림)`);
    for (const part of ["to", "from"]) for (const [k, v] of Object.entries(t?.[part] ?? {})) {
      if (!GSAP_PROPS.has(k)) err(id, `${at}.${part}: 모르는 속성 "${k}" (엔진이 버림)`);
      else if (typeof v !== "number" || !Number.isFinite(v)) err(id, `${at}.${part}.${k}: 숫자가 아님 "${v}" (상대값·단위·random()은 엔진이 버림)`);
    }
    if (t?.ease && !EASINGS.has(t.ease) && !isGsapEase(t.ease)) err(id, `${at}: 모르는 ease "${t.ease}" (엔진은 선형으로 처리함)`);
    if (typeof t?.position === "string" && !GSAP_POSITION.test(t.position.trim())) err(id, `${at}: position "${t.position}"은 엔진이 모름 (라벨 불가, 앞 tween 뒤에 붙음)`);
    if (t?.repeat !== undefined && (t.repeat < 0 || t.repeat > 100)) err(id, `${at}: repeat ${t.repeat} (엔진은 0–100으로 자름, -1 무한 불가)`);
  });
  if (Number(a.options?.delay) > 0) warn(id, "gsapTimeline에 options.delay: delay 전에는 from 값이 걸리지 않음. 첫 tween의 position에 대기를 넣으세요 (gsap.md §4)");
}
const SHAPE_ONLY = new Set(["strokeDraw"]);
// paint 키: Shape(fillColor·strokeColor·strokeWidth·borderRadius·fill, pie는 startAngle·endAngle·innerRadius),
// Text(color·strokeColor·strokeWidth·letterSpacing + 가변 폰트 축 wght·wdth·… 4글자 태그, 엔진 3.0.25+)
const PAINT_SHAPE = new Set(["fillColor", "strokeColor", "strokeWidth", "borderRadius", "fill", "startAngle", "endAngle", "innerRadius", "easing"]);
const PAINT_TEXT = new Set(["color", "strokeColor", "strokeWidth", "letterSpacing", "fontWeight", "fontWidth", "fontSlant", "opticalSize", "easing"]);
const AXIS_TAG = /^(?:[a-z]{4}|[A-Z]{4})$/;
const FILTERS = new Set(["adjustment", "advancedBloom", "backdropBlur", "bloom", "colorMap", "colorOverlay", "convolution", "dot", "dropShadow", "glitch", "glow", "godray", "grayscale", "hslAdjustment", "kawaseBlur", "motionBlur", "oldFilm", "pixelate", "radialBlur", "reflection", "rgbSplit", "tiltShift"].map((n) => `${n}Filter`));
const BACKDROPS = new Set(["solid", "gradient", "meshGradient", "noise", "floatingBlobs"]);
// Core(Studio 로딩)는 이 타입들만 빈 src를 허용하고 나머지는 클립을 버린다
const SRC_OPTIONAL = new Set(["Text", "Caption", "Effect", "Transition"]);
const FPS = p => p.settings?.fps ?? 30;
// 폰트 파일 이름 → 그 파일의 실제 굵기 (앱 경로 /fonts/… 와 CDN 경로 모두 파일 이름으로 맞춘다)
const fileName = (u) => decodeURIComponent(String(u ?? "").split(/[\\/]/).pop().split("?")[0]);
const WEIGHT_OF_FILE = new Map(FONTS.flatMap((f) => f.variants.filter((v) => v.url && !v.derived).map((v) => [fileName(v.url), v.weight])));

const file = process.argv[2] ?? "project.json";
const p = JSON.parse(fs.readFileSync(file, "utf8"));
const issues = [];
const err = (id, m) => issues.push(`✗ ${id}: ${m}`);
const warnings = [];
const warn = (id, m) => warnings.push(`△ ${id}: ${m}`);
const entranceStarts = new Map(); // 입장 시작 프레임 → 클립 id들 (R7)
const fontUrls = new Map(); // fontFamily → Set(fontUrl) (B5)
const dur = p.settings?.duration ?? Infinity;

for (const [id, c] of Object.entries(p.clips ?? {})) {
  const d = c.timing?.display;
  if (!d) err(id, "timing.display 없음");
  else if (d.to > dur) err(id, `프로젝트 길이를 넘음 (${d.to} > ${dur} μs)`);
  // 트랙 매트(style.matte, engine 3.0.13+): 다른 클립의 픽셀로 이 클립을 도려낸다
  const matte = c.style?.matte;
  if (matte != null) {
    const src = p.clips?.[matte.clipId];
    if (!matte.clipId) err(id, "style.matte.clipId 없음");
    else if (matte.clipId === id) err(id, "style.matte가 자기 자신을 가리킴");
    else if (!src) err(id, `style.matte.clipId "${matte.clipId}" 클립이 없음 (alpha·luma 대상은 안 보이게 됨)`);
    else if (["Audio", "Transition", "Effect"].includes(src.type)) err(id, `style.matte가 ${src.type} 클립을 가리킴 (픽셀이 없어 마스크가 안 됨)`);
    else {
      const a = src.timing?.display, b = c.timing?.display;
      if (a && b && (a.from > b.from || a.to < b.to)) warn(id, `매트 클립 "${matte.clipId}"이 대상보다 짧음: 매트가 없는 구간은 ${String(matte.mode ?? "alpha").includes("Inverted") ? "그대로 보임" : "대상이 안 보임"}`);
    }
    if (matte.mode != null && !["alpha", "alphaInverted", "luma", "lumaInverted"].includes(matte.mode)) err(id, `style.matte.mode "${matte.mode}"를 엔진이 모름 (alpha·alphaInverted·luma·lumaInverted)`);
  }
  for (const a of c.animations ?? []) {
    if (!MOTION_TYPES.has(a.type)) err(id, `모르는 모션 type "${a.type}"`);
    if (SHAPE_ONLY.has(a.type) && c.type !== "Shape") err(id, `${a.type}는 Shape 전용`);
    if (a.type === "countUp" && c.type !== "Text") err(id, "countUp은 Text 전용");
    if (a.type === "paint") for (const v of Object.values(a.params ?? {})) for (const k of Object.keys(v ?? {})) {
      const ok = c.type === "Text" ? PAINT_TEXT.has(k) || AXIS_TAG.test(k) : PAINT_SHAPE.has(k);
      if (!ok) err(id, `paint 키 "${k}"는 ${c.type}에서 엔진이 모름 (무시됨)`);
      if (c.type === "Text" && (AXIS_TAG.test(k) || ["fontWeight", "fontWidth", "fontSlant", "opticalSize"].includes(k)) && !c.style?.fontUrl) err(id, `paint "${k}"(가변 폰트 축)는 style.fontUrl에 가변 폰트 파일이 있어야 함`);
    }
    const e = a.options?.easing;
    if (e && !EASINGS.has(e) && !isGsapEase(e)) err(id, `모르는 easing "${e}" (엔진은 선형으로 처리함)`);
    if (a.type === "gsapTimeline") checkGsapTimeline(id, a);
    if (a.type === "keyframes") for (const [stop, v] of Object.entries(a.params ?? {})) {
      for (const k of Object.keys(v)) if (!KEYFRAME_KEYS.has(k)) err(id, `keyframes ${stop}: 모르는 키 "${k}"`);
      if (v.easing && !EASINGS.has(v.easing) && !isGsapEase(v.easing)) err(id, `keyframes ${stop}: 모르는 easing "${v.easing}"`);
      if ("opacity" in v && /Back|Elastic|^back|^elastic/.test(String(v.easing ?? ""))) warn(id, `keyframes ${stop}: opacity 구간에 넘치는 이징 "${v.easing}" (0..1 밖으로 나감, easing.md §2)`);
    }
  }
  if (c.type === "Transition" && c.easing && !EASINGS.has(c.easing) && !isGsapEase(c.easing)) err(id, `전환 easing "${c.easing}"을 엔진이 모름 (선형으로 처리됨)`);
  if (!SRC_OPTIONAL.has(c.type) && !(c.src && String(c.src).trim())) err(id, `${c.type}에 src 없음 (Core가 클립을 버림. 절차적 클립은 "backdrop"/"shape"/"script"/"three" 같은 표식 값)`);
  // blob: 주소는 그 앱 세션에서만 읽힘. 새 프로젝트로 불러오면 빈 화면이 된다 (engine-recipes §9)
  if (/^blob:/.test(String(c.src ?? "").trim())) err(id, "src가 blob: 주소 (새 프로젝트에서 안 보임). 앱에서 가져온 클립이면 metadata._encoding.inputExtras.originalSrc의 CDN 주소를 쓰세요");
  if (c.type === "Shape") {
    // 도형 종류는 클립 최상위 shapeType만 읽힘. style 안에 두면 사각형으로 그려진다
    // 그라데이션은 style.gradient. fill에 CSS 그라데이션을 넣으면 캔버스가 색을 못 읽어 단색(검정) 면이 된다
    if (/gradient\(/.test(String(c.style?.fill ?? ""))) err(id, `style.fill에 그라데이션 "${String(c.style.fill).slice(0, 30)}…" (단색으로 그려짐). style.gradient에 넣으세요`);
    if (c.style?.shapeType && c.style.shapeType !== c.shapeType) err(id, `style.shapeType "${c.style.shapeType}"은 무시됨 (도형 종류는 클립의 shapeType에: { type: "Shape", shapeType: "${c.style.shapeType}" })`);
  }
  if (c.type === "Effect" && !FILTERS.has(c.effectKey)) err(id, `모르는 Effect 필터 "${c.effectKey}" (이름은 …Filter 형식)`);
  for (const fx of c.effects ?? []) if (!FILTERS.has(fx.key)) err(id, `clip.effects: 모르는 필터 "${fx.key}"`);
  if (c.type === "Backdrop") {
    const bt = c.backdropType ?? c.style?.backdropType ?? "solid";
    if (!BACKDROPS.has(bt)) err(id, `모르는 backdropType "${bt}"`);
  }
  if (c.type === "Text" || c.type === "Caption") {
    const fam = c.style?.fontFamily;
    const text = c.type === "Caption" ? (c.caption?.words ?? []).map((w) => w.text).join(" ") || c.text : c.text;
    const hit = fam && findFont(fam);
    if (!fam) err(id, "style.fontFamily 없음 (brand.json fonts 토큰을 fontStyle()로 넣으세요)");
    else if (!hit) warn(id, `"${fam}"은 admaker 폰트 목록(fonts.json)에 없음: 앱에서 다른 폰트로 보일 수 있음 (B5)`);
    else if (!hit.font.korean && hasHangul(text)) err(id, `"${fam}"은 한글이 없는 폰트인데 한글 텍스트 (B5)`);
    if (fam && !c.style?.fontUrl) err(id, `"${fam}"에 fontUrl 없음 (엔진이 폰트를 못 불러옴)`);
    // 손글씨 폰트 짧은 문구에 lineBoil이 없으면 '손맛'이 빠짐 (engine-recipes §3.2)
    if (hit && /^hand/.test(hit.font.category ?? "") && String(text ?? "").length <= 20 && !(c.animations ?? []).some((a) => a.type === "lineBoil"))
      warn(id, `손글씨 폰트 "${fam}"인데 lineBoil 없음: motion.mjs handwriting()으로 handwrite_in + lineBoil을 붙이세요 (engine-recipes §3.2, 의도했다면 무시)`);
    // 가는 파일에 굵기를 요청하면 가짜 볼드(획만 두꺼워짐)가 됨. 굵은 파일 하나를 고르세요 (B5, fonts.mjs fontStyle)
    const fileW = WEIGHT_OF_FILE.get(fileName(c.style?.fontUrl));
    const wantW = Number(c.style?._weight ?? (c.style?.fontWeight === "bold" ? 700 : c.style?.fontWeight));
    if (fileW && fileW <= 300 && wantW >= 600) warn(id, `"${fam}" 굵기 ${wantW}를 원하는데 파일은 ${fileW}(${fileName(c.style.fontUrl)}): 가짜 볼드로 보임. fontStyle({ name, weight: ${wantW} })로 굵은 파일을 고르세요`);
    if (fam && c.style?.fontUrl) fontUrls.set(fam, new Set([...(fontUrls.get(fam) ?? []), c.style.fontUrl]));
  }
  const kfs = (c.animations ?? []).filter((a) => a.type === "keyframes");
  for (const a of kfs) {
    const pctOf = (k) => (/^from$/i.test(k) ? 0 : /^to$/i.test(k) ? 100 : parseFloat(k));
    const sorted = Object.entries(a.params ?? {}).sort((x, y) => pctOf(x[0]) - pctOf(y[0]));
    const stops = sorted.map(([, v]) => v);
    const first = stops[0] ?? {};
    const same = (v) => JSON.stringify(Object.entries(v).filter(([k]) => k !== "easing").sort()) === JSON.stringify(Object.entries(first).filter(([k]) => k !== "easing").sort());
    let held = 0; // 첫 값을 붙잡는 stop(holdFrom) 뒤에서 실제 입장이 시작
    for (const [k, v] of sorted.slice(1)) { if (!same(v)) break; held = pctOf(k); }
    if (first.opacity === 0 && (a.options?.delay ?? 0) > 0)
      err(id, "입장 keyframes에 options.delay: 엔진은 delay 전에 0% 값을 걸지 않아 클립이 먼저 보였다가 사라짐 (motion.mjs entrance/holdFrom 사용)");
    const moved = Object.keys(first).filter((k) => k !== "easing");
    if (moved.length === 1 && moved[0] === "opacity" && first.opacity === 0) warn(id, "opacity만 바뀌는 단독 페이드 입장 (R6: 위치·scale을 함께)");
    if (first.opacity === 0 && d) {
      const f = Math.round(((d.from + (a.options?.delay ?? 0) + (held / 100) * (a.options?.duration ?? 0)) / 1e6) * FPS(p));
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

for (const [fam, urls] of fontUrls) if (urls.size > 1) err(fam, `한 폰트 이름에 파일 ${urls.size}개 (엔진은 이름 하나에 파일 하나만 등록함, B5: 한글 폰트는 프로젝트당 한 굵기)`);
const families = new Set([...fontUrls.keys()].map((f) => findFont(f)?.font.name ?? f));
if (families.size > 3) warn("fonts", `폰트 패밀리 ${families.size}개 (B4: 디스플레이 1 + 본문 1 + 숫자 1 이하)`);
// 모션 전용 씬(인터루드, references/interludes.md): timeline.mjs의 INTERLUDES(초). 이 구간은 소재 없이 그래픽만 둔다
let TIMELINE = {};
try { TIMELINE = await import(new URL(`file://${process.cwd()}/timeline.mjs`).href); } catch { /* timeline 없음 */ }
const INTERLUDES = Array.isArray(TIMELINE.INTERLUDES) ? TIMELINE.INTERLUDES.filter((w) => w && w.to > w.from) : [];
const inInterlude = (d) => INTERLUDES.some((w) => d.from >= w.from * 1e6 - 1e5 && d.to <= w.to * 1e6 + 1e5);
// Q11: 광고의 바닥은 사용자 영상·이미지. 그 위를 넓게(60%+) 1초 넘게 덮는 층은 소재를 어둡게·뿌옇게 만들 수 있어 참고 경고(의도했다면 무시)
const { width: PW = 1080, height: PH = 1920 } = p.settings ?? {};
const clipsAll = Object.entries(p.clips ?? {});
const footage = clipsAll.filter(([, c]) => (c.type === "Video" || c.type === "Image") && !String(c.src ?? "").startsWith("data:")
  && (c.transform?.width ?? 0) * (c.transform?.height ?? 0) >= PW * PH * 0.6);
// 클립 그룹 — 멤버의 groupId는 groups 기록이 있어야 하고, 그룹 하나에 멤버가 2개 이상이어야 앱에서 그룹으로 남는다
const groupCount = {};
for (const [id, c] of Object.entries(p.clips ?? {})) {
  if (!c?.groupId) continue;
  if (!p.groups?.[c.groupId]) warn(id, `groupId "${c.groupId}"가 groups에 없음 (이름 없는 그룹으로 들어감)`);
  groupCount[c.groupId] = (groupCount[c.groupId] ?? 0) + 1;
}
for (const [gid, n] of Object.entries(groupCount)) if (n < 2) warn(gid, "그룹 멤버가 1개뿐이라 앱에서 그룹이 풀림 (2개 이상 묶기)");
if (!footage.length) warn("footage", "프레임을 채우는 사용자 영상·이미지가 없음 (Q11: 보통 소재를 맨 아래에 깔고 그래픽을 얹음)");
const footZ = Math.min(...footage.map(([, c]) => c.transform?.zIndex ?? 0));
const svgOf = (src) => { try { return decodeURIComponent(String(src).replace(/^data:image\/svg\+xml[^,]*,/, "")); } catch { return ""; } };
const outlineOnly = (svg) => /fill="none"/.test(svg) && !/<rect|fill="#|fill="rgb/.test(svg.replace(/flood-color="[^"]*"/g, ""));
for (const [id, c] of clipsAll) {
  if (footage.some(([fid]) => fid === id) || id === "look_vignette") continue;
  if (!["Image", "Shape", "Video"].includes(c.type)) continue;
  const t = c.transform ?? {}, d = c.timing?.display;
  const area = Math.max(0, Math.min(PW, t.x + t.width) - Math.max(0, t.x)) * Math.max(0, Math.min(PH, t.y + t.height) - Math.max(0, t.y));
  if (area < PW * PH * 0.6 || (t.opacity ?? 1) < 0.1 || !d || d.to - d.from <= 1e6 || (t.zIndex ?? 0) <= footZ) continue;
  if (inInterlude(d)) continue; // 모션 전용 씬의 바닥·그래픽 면은 소재를 덮는 층이 아님
  if (c.type === "Image" && String(c.src).startsWith("data:image/svg") && outlineOnly(svgOf(c.src))) continue;
  if (c.type === "Shape" && ((c.style?.fillOpacity ?? 1) < 0.1 || /transparent|none/.test(c.style?.fill ?? ""))) continue;
  warn(id, `화면의 ${Math.round((area / (PW * PH)) * 100)}%를 ${((d.to - d.from) / 1e6).toFixed(1)}초 덮는 층(불투명도 ${t.opacity ?? 1}): 소재가 어둡거나 뿌옇게 보일 수 있음. 의도한 게 아니면 글자 주변 받침이나 선 위주로 (Q11)`);
}
// 씬 전환이 밋밋한지 (transitions.md): 소재가 바뀌는 곳이 2곳 이상인데 매트·am-*·마스크 같은 전환 그래픽이 하나도 없거나 fade뿐
{
  const PLAIN = new Set(["fade", "fadeIn", "fadeOut", "dissolve"]);
  const MASKS = new Set(["wipe", "circleReveal", "rectExpand", "angleWipe", "starReveal", "centerExpand", "blockReveal"]);
  const trs = clipsAll.filter(([, c]) => c.type === "Transition").sort(([, a], [, b]) => (a.timing?.display?.from ?? 0) - (b.timing?.display?.from ?? 0));
  const designed = trs.filter(([, c]) => !PLAIN.has(c.transitionKey ?? "fade")).length
    + clipsAll.filter(([, c]) => c.style?.matte).length
    + clipsAll.filter(([, c]) => (c.animations ?? []).some((a) => MASKS.has(a.type))).length
    + clipsAll.filter(([id, c]) => /^(flood|flash|zoom|mont|match|card|curve|whip|freeze|scribble)\d+_/.test(id) || /transition|wipe/i.test(String(c.name ?? ""))).length; // 전환 샷(shots/transition-*.mjs)이 만든 클립
  const cuts = new Set(footage.map(([, c]) => c.timing?.display?.from ?? 0)).size - 1;
  if (cuts >= 2 && designed === 0) warn("transitions", `소재가 바뀌는 곳이 ${cuts}곳인데 전환 그래픽이 없음${trs.length ? "(fade·dissolve뿐)" : ""}. 시그니처 한 곳은 트랙 매트·줌 스루·잉크 번짐, 나머지는 am-* 전환·마스크로 (transitions.md)`);
  for (let i = 1; i < trs.length; i++) {
    const k = trs[i][1].transitionKey ?? "fade";
    if (!PLAIN.has(k) && k === (trs[i - 1][1].transitionKey ?? "fade")) warn(trs[i][0], `전환 "${k}"를 연속 두 번 씀 (transitions.md: 섞어 쓰기)`);
  }
}
// 씬 이음새 (transitions.md §0·§4, seams.mjs)
{
  const fps = FPS(p), fr = 1e6 / fps;
  const byId = p.clips ?? {};
  // 1. 전환 클립 자리: 앱으로 가져가면 앱 규칙(appTransitionWindow)대로 다시 놓인다. 엔진 렌더와 앱이 같은 박에 보이게 맞춘다
  for (const [id, c] of clipsAll) {
    if (c.type !== "Transition" || !c.fromClipId || !c.toClipId) continue;
    const A = byId[c.fromClipId], B = byId[c.toClipId], d = c.timing?.display;
    if (!A || !B || !d) { err(id, `전환의 from/to 클립(${c.fromClipId} → ${c.toClipId})이 없음 (클립에 id를 꼭 적기)`); continue; }
    const win = appTransitionWindow(A, B, d.to - d.from);
    const sec = (v) => (v / 1e6).toFixed(2);
    if (win.mode === "freeze_overlay") warn(id, `두 소재가 겹치지 않아 앱에서는 전환이 앞 소재 끝(${sec(win.from)}–${sec(win.to)}초)으로 옮겨지고 다음 소재는 첫 프레임에 멈춘 채 섞임. 전환 길이만큼 소재를 겹치고(앞 소재 끝 = 컷 + 길이/2, 다음 소재 시작 = 컷 − 길이/2) 전환을 그 겹침에 두세요 (engine-recipes §5)`);
    else if (Math.abs(win.from - d.from) > fr || Math.abs(win.to - d.to) > fr) warn(id, `앱으로 가져가면 전환이 ${sec(d.from)}–${sec(d.to)}초에서 ${sec(win.from)}–${sec(win.to)}초로 옮겨짐 (박이 밀림). 전환 구간을 두 소재가 겹치는 구간과 같게 (engine-recipes §5)`);
  }
  // 2. Z축 뒤집힘 (장부 없이도)
  for (const m of autoZSign(p)) warn("seam", m);
  // 3. 컷 순간 바닥: 프레임을 다 덮는 불투명한 층이 없으면 전환 중 배경(흰색·검정)이 비침 (Exporter는 settings.backgroundColor를 안 칠함)
  // 그 순간 실제 상자(이동·크기 모션 포함)가 화면을 다 덮는지
  const covers = (s) => s.cx - s.w / 2 <= 1 && s.cy - s.h / 2 <= 1 && s.cx + s.w / 2 >= PW - 1 && s.cy + s.h / 2 >= PH - 1;
  const solid = (c) => ["Video", "Image", "Backdrop"].includes(c.type) || (c.type === "Shape" && ["rectangle", "rect"].includes(c.shapeType ?? c.style?.shapeType) && (c.style?.fillOpacity ?? 1) >= 0.99 && !/transparent|none|rgba\(/.test(String(c.style?.fill ?? "")));
  const grounds = clipsAll.filter(([, c]) => solid(c));
  // 소재가 바뀌는 시각. 셰이더 전환 클립이 덮는 컷은 셰이더가 불투명하게 그리므로 뺀다
  const trWin = clipsAll.filter(([, c]) => c.type === "Transition").map(([, c]) => c.timing?.display).filter(Boolean);
  const cutTimes = new Set(footage.map(([, c]) => (c.timing?.display?.from ?? 0) / 1e6)
    .filter((t) => t > 0 && !trWin.some((d) => d.from <= t * 1e6 + fr && d.to >= t * 1e6 - fr)));
  for (const t of cutTimes) {
    const ok = [t - 1 / fps, t, t + 1 / fps].every((tt) => grounds.some(([, c]) => { const s = sampleClip(c, tt); return s.visible && s.opacity >= 0.99 && covers(s); }));
    if (!ok) warn("seam", `${t.toFixed(2)}초 이음새에서 프레임을 다 덮는 불투명한 층이 없음 — 소재가 밀리거나 줄어 생긴 틈, 두 장면 투명도 합이 1보다 작아지는 순간에 배경이 비쳐 번쩍임. 맨 아래에 화면 가득 불투명 배경 Shape를 깔기 (transitions.md §0)`);
  }
  // 4. 장부(timeline.mjs의 SEAMS)가 있으면 숫자로 검사
  let SEAMS = null;
  try { ({ SEAMS } = await import(new URL(`file://${process.cwd()}/timeline.mjs`).href)); } catch { /* 장부 없음 */ }
  if (Array.isArray(SEAMS) && SEAMS.length) {
    const r = checkSeams(p, SEAMS, fps);
    for (const m of r.errors) err("seam", m);
    for (const m of r.warnings) warn("seam", m);
  }
}
// 모션 전용 씬: 바닥(화면 가득 불투명한 층)이 있는지 ✗, 개수·비율·간격이 템포 상한 안인지 △ (interludes.md §6)
if (INTERLUDES.length) {
  const { tempoClass, checkInterludes } = await import(new URL("./interludes.mjs", import.meta.url).href);
  const full = (c) => { const t = c.transform ?? {}; return (t.x ?? 0) <= 1 && (t.y ?? 0) <= 1 && (t.x ?? 0) + (t.width ?? 0) >= PW - 1 && (t.y ?? 0) + (t.height ?? 0) >= PH - 1 && (t.opacity ?? 1) >= 0.99; };
  const opaque = (c) => (c.type === "Shape" && (c.style?.fillOpacity ?? 1) >= 0.99 && !/transparent|none|rgba\([^)]*,\s*0(\.\d+)?\)/.test(c.style?.fill ?? "")) || ((c.type === "Image" || c.type === "Video") && !String(c.src ?? "").startsWith("data:image/svg"));
  for (const w of INTERLUDES) {
    for (const tt of [w.from + 0.05, (w.from + w.to) / 2, w.to - 0.05]) {
      const ok = clipsAll.some(([, c]) => { const d = c.timing?.display; return d && d.from <= tt * 1e6 && d.to >= tt * 1e6 && full(c) && opaque(c); });
      if (!ok) { err("interlude", `${w.from.toFixed(2)}–${w.to.toFixed(2)}초 모션 전용 씬 ${tt.toFixed(2)}초에 화면 가득한 불투명 바닥이 없음 (interludes.md §5: 브랜드 색 Shape를 맨 아래에)`); break; }
    }
  }
  const bpm = TIMELINE.ANALYSIS?.bpm ?? TIMELINE.BPM ?? 120;
  const tempo = TIMELINE.TEMPO ?? tempoClass({ bpm, direction: TIMELINE.DIRECTION, request: TIMELINE.REQUEST ?? "" });
  const duration = TIMELINE.DURATION ?? Math.max(0, ...clipsAll.map(([, c]) => c.timing?.display?.to ?? 0)) / 1e6;
  for (const m of checkInterludes({ tempo, duration, windows: INTERLUDES, beatSec: TIMELINE.BEAT ?? 60 / bpm })) (m.level === "✗" ? err : warn)("interlude", m.msg);
}
// F2 화려함 기본값: 3초 구간마다 바닥 소재를 빼고 움직이는 층(모션·글자 애니메이션·어댑터·이펙트)이 3개 이상인지. 마지막 1.5초(엔드카드 정지)는 뺌
{
  const footIds = new Set(footage.map(([id]) => id));
  const moving = clipsAll.filter(([id, c]) => !footIds.has(id) && !["Audio", "Transition"].includes(c.type)
    && ((c.animations ?? []).length || c.style?.characterAnimation || ["Adapter", "Effect", "Lottie"].includes(c.type)))
    .map(([, c]) => c.timing?.display).filter(Boolean);
  const end = Math.max(0, ...clipsAll.map(([, c]) => c.timing?.display?.to ?? 0));
  const thin = [];
  for (let t = 0; t + 3e6 <= end - 1.5e6; t += 3e6) {
    const n = moving.filter((d) => d.from < t + 3e6 && d.to > t).length;
    if (n < 3) thin.push(`${(t / 1e6).toFixed(0)}–${((t + 3e6) / 1e6).toFixed(0)}초(${n}층)`);
  }
  if (thin.length) warn("density", `움직이는 층이 3개 미만인 구간: ${thin.join(", ")}. 기본은 화려하게: 장면마다 주인공·그래픽 보조·빛 세 층 (aesthetic-rules F2, 차분한 톤을 요청받았으면 무시)`);
}
for (const [f, ids] of entranceStarts) if (ids.length >= 3) warn(ids.join(", "), `프레임 ${f}에 입장 ${ids.length}개 동시 시작 (R7: 3–6프레임 시차)`);
console.log(issues.length ? issues.join("\n") : "✓ 검사 통과");
if (warnings.length) console.log(warnings.join("\n"));
process.exit(issues.length ? 1 : 0);
