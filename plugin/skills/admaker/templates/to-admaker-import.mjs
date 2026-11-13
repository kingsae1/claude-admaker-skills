// project.json(엔진 ProjectJSON) → admaker 앱 "광고 불러오기" 파일(EncodingPayload wire JSON)
// 사용: node to-admaker-import.mjs [project.json] [out=admaker-import.json]
// 앱은 엔진 ProjectJSON을 직접 받지 않고 inputs·tracks·output·admaker_meta 형식만 받는다.
// 앱에 대응이 없는 것은 경고와 함께 빼거나 바꾼다(references/engine-recipes.md §9). 앱 코드를 복사하지 않고 형식만 맞춘다.
import fs from "node:fs";

/** 앱 엔진에 내장된 three 장면. 그 밖의 커스텀 씬은 영상으로 구워 넣는다(bake). */
const APP_THREE_SCENES = new Set(["model", "morph"]);

const [inFile = "project.json", outFile = "admaker-import.json"] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(inFile, "utf8"));
const S = p.settings ?? {};
const W = S.width ?? 1080, H = S.height ?? 1920, FPS = S.fps ?? 30;
const sec = (us) => Math.round((Number(us) || 0) / 1000) / 1000;
const warnings = [];
const warn = (id, m) => warnings.push(`△ ${id}: ${m}`);

// 앱이 그대로 엔진 모션으로 넘기는 type (그 밖의 type은 앱이 버린다)
const EP_MOTION_TYPES = new Set(["keyframes", "shake", "unfold", "fold", "strokeDraw", "paint", "countUp", "lineBoil", "wipe", "circleReveal", "rectExpand", "angleWipe", "starReveal", "centerExpand", "blockReveal", "gsapTimeline"]);
// 앱이 xfade 이름으로 내보내는 전환 (엔진 key → wire type)
const TRANSITION_TO_WIRE = { fadeIn: "fade", fadeOut: "fade", fade: "fade", zoomIn: "zoomin", slideLeft: "slideleft", slideRight: "slideright", slideUp: "slideup", slideDown: "slidedown", wipeLeft: "wipeleft", wipeRight: "wiperight", coverRight: "coverright", coverLeft: "coverleft", coverUp: "coverup", coverDown: "coverdown" };
// admaker 전환 팩(am-*): 앱 서버 인코딩에는 가장 가까운 xfade로 (엔진 getAdmakerTransitionInfo().xfade와 같은 값)
const AM_TRANSITION_XFADE = { "am-flash-streak": "fadewhite", "am-cover-flood": "circleclose", "am-zoom-through": "zoomin", "am-card-swap": "smoothleft", "am-push": "slideleft", "am-ink-bleed": "dissolve",
  "am-cut-curve": "smoothleft", "am-zoom-blur": "zoomin", "am-rack-focus": "hblur", "am-light-leak": "fadewhite", "am-pixelate": "pixelize", "am-rgb-split": "wipeleft" };
// 트랙 행 순서를 바꿔도 클립 겹침 순서가 유지되도록 앱의 "명시 zIndex" 구간(≥ 1,000,000)으로 옮긴다
const Z_BASE = 1_000_000;

const inputs = [];
const inputBySrc = new Map();
let inputSeq = 0;
function inputFor(src, type, extra = {}) {
  const key = `${type}:${src}`;
  if (inputBySrc.has(key)) return inputBySrc.get(key);
  const s = String(src).trim();
  const inputType = s.startsWith("<svg") ? "svg" : s.startsWith("data:") ? "base64" : /^(https?:|blob:)/.test(s) ? "url" : "local";
  const name = `${type}_${String(++inputSeq).padStart(4, "0")}`;
  inputs.push({ name, type, inputType, src: s, ...extra });
  inputBySrc.set(key, name);
  return name;
}

function animationsToWire(id, clip) {
  const out = [];
  for (const a of clip.animations ?? []) {
    if (!EP_MOTION_TYPES.has(a.type)) { warn(id, `모션 "${a.type}"는 앱이 받지 않아 뺐습니다`); continue; }
    const o = a.options ?? {};
    if (o.direction && o.direction !== "normal") warn(id, `모션 options.direction "${o.direction}"은 앱에서 보존되지 않습니다 (keyframes에 왕복 stop을 직접 쓰세요)`);
    const origin = o.origin === "group" || (Number.isFinite(o.origin?.x) && Number.isFinite(o.origin?.y)) ? o.origin : undefined; // 그룹 중심(또는 캔버스 점) 기준 회전·크기
    out.push({ type: a.type, start: sec(o.delay), duration: sec(o.duration), easing: o.easing ?? "linear", iterCount: Math.max(1, Math.round(o.iterCount ?? 1)), params: { ...(a.params ?? {}) }, ...(origin ? { origin } : {}) });
  }
  return out;
}

function baseTransform(clip) {
  const t = clip.transform ?? {};
  const out = { x: t.x ?? 0, y: t.y ?? 0, width: t.width ?? 0, height: t.height ?? 0, opacity: t.opacity ?? 1, rotation: { angle: t.angle ?? 0 } };
  if (Number.isFinite(t.zIndex)) out.zIndex = Z_BASE + t.zIndex;
  // 3D 자세(X·Y 회전, Z 위치, 원근) — 앱은 transform.transform3d로 받는다. Z 회전은 rotation.angle
  const pose = {};
  for (const key of ["rotateX", "rotateY", "z", "perspective"]) {
    const v = Number(clip.transform3d?.[key]);
    if (Number.isFinite(v) && v !== 0) pose[key] = v;
  }
  if (Object.keys(pose).length) out.transform3d = pose;
  return out;
}

function textTransform(clip) {
  const s = clip.style ?? {};
  const t = baseTransform(clip);
  if (s.fontFamily) t.fontName = String(s.fontFamily);
  if (s.fontUrl) t.fontUrl = String(s.fontUrl);
  if (s.fontSize) t.fontSize = Number(s.fontSize);
  if (s.color ?? s.fill) t.color = String(s.color ?? s.fill);
  t.align = s.align ?? "center";
  t.verticalAlign = s.verticalAlign === "center" || !s.verticalAlign ? "middle" : s.verticalAlign;
  if (s.lineHeight != null && s.fontSize) t.lineSpacing = Number(s.fontSize) * (Number(s.lineHeight) - 1);
  // fonts.mjs는 엔진용 fontWeight를 "400"으로 두고 원래 굵기를 _weight에 남긴다. 앱의 한글(legacy) 폰트는 굵기를 isBold(700)로만 받는다.
  // Latin 폰트는 postScriptName(예: Montserrat-Bold)에 굵기가 들어 있으므로 isBold를 붙이지 않는다
  const weight = Number(s._weight ?? (s.fontWeight === "bold" ? 700 : s.fontWeight));
  if (weight >= 600 && !/-(\w+)$/.test(String(s.fontFamily ?? ""))) t.isBold = true;
  if (s.fontStyle === "italic") t.isItalic = true;
  if (s.background) t.boxColor = String(s.background);
  if (s.stroke && Number(s.stroke.width) > 0) { t.textStrokeWidth = Number(s.stroke.width); if (s.stroke.color) t.textStrokeColor = String(s.stroke.color); }
  if (s.shadow) t.textShadow = s.shadow;
  // 글자 단위 애니메이션·스타일은 앱의 text_segment 렌더러가 transform에서 읽는다
  for (const k of ["characterAnimation", "characterStyles", "characterShove", "animationBox", "lineBoxes"]) if (s[k] !== undefined) t[k] = s[k];
  return t;
}

const wireTracks = [];
const clipName = (id) => id; // 앱은 클립 id를 "ep_<name>"으로 되살린다
const skipped = new Set();
// 트랙 매트(style.matte): 가리키는 클립이 뒤 트랙에 있을 수 있어 모든 클립을 옮긴 뒤 이어 준다
const matteTargets = [];

// ① 배경 트랙: 앱은 track_bg의 단색 SVG를 settings.backgroundColor로 읽는다
const bgColor = S.backgroundColor ?? "#000000";
const bgInput = inputFor(`<svg width='${W}' height='${H}' viewBox='0 0 ${W} ${H}' xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='${bgColor}'/></svg>`, "image");
wireTracks.push({ name: "track_bg", type: "image", clips: [{ name: "bg", clipType: "image", source: bgInput, timelineTrackStart: 0, duration: sec(S.duration), transform: { x: 0, y: 0, width: W, height: H, opacity: 1, rotation: { angle: 0 } } }] });

// ② 트랙: 엔진 트랙마다 하나. 행 순서는 클립 zIndex가 높은 트랙이 위(studioRow 0)
const engineTracks = (p.tracks ?? []).filter((t) => t.type !== "Transition");
const topZ = (t) => Math.max(0, ...t.clipIds.map((id) => p.clips[id]?.transform?.zIndex ?? 0));
const ordered = [...engineTracks].sort((a, b) => topZ(b) - topZ(a));

// 트랙 이름: 앱은 트랙을 이름으로 묶으므로(같은 이름이면 뒤 트랙이 앞 트랙을 덮어씀) 이름이 겹치지 않게 만든다.
// 한글 등 비ASCII 이름은 "_"로 바뀌어 서로 같아지기 쉽다(예: "카피 1"과 "와이프 1" → track____1)
const usedTrackNames = new Set(["track_bg"]);
function trackNameFor(track) {
  const raw = String(track.name ?? track.id).replace(/^t_/, "");
  const base = `track_${raw.replace(/[^\w-]/g, "_")}`;
  let name = base, i = 2;
  while (usedTrackNames.has(name)) name = `${base}_${i++}`;
  usedTrackNames.add(name);
  if (/[^\w-]/.test(raw) || name !== base) warn(String(track.id), `트랙 이름 "${raw}"을 "${name}"으로 바꿨습니다 (앱 트랙 이름은 ASCII, 겹치지 않게)`);
  return name;
}
// 레인: 앱 타임라인 행 하나에는 시간이 겹치지 않는 클립만 둔다. 겹치면 같은 트랙을 레인 여러 개로 나눈다(겹침 순서는 zIndex로 유지)
function splitLanes(clipIds) {
  const span = (id) => p.clips[id]?.timing?.display ?? { from: 0, to: 0 };
  const sorted = [...clipIds].filter((id) => p.clips[id]).sort((a, b) => span(a).from - span(b).from);
  const lanes = [];
  for (const id of sorted) {
    const lane = lanes.find((l) => span(l.at(-1)).to <= span(id).from);
    if (lane) lane.push(id); else lanes.push([id]);
  }
  return lanes;
}

let row = 0;
for (const track of ordered) {
  const lanes = track.type === "Audio" ? [track.clipIds] : splitLanes(track.clipIds);
  const trackName = trackNameFor(track);
  for (const [lane, laneIds] of lanes.entries()) {
  const clips = [];
  for (const id of laneIds) {
    const c = p.clips[id];
    if (!c) continue;
    const d = c.timing?.display ?? { from: 0, to: 0 };
    const base = { name: clipName(id), timelineTrackStart: sec(d.from), duration: sec(d.to - d.from) };
    const anim = animationsToWire(id, c);
    // 클립 필터(dropShadow·glow·rgbSplit 등) — 앱은 transform.clipEffects로 받는다(엔진 형식 그대로)
    const clipEffects = (c.effects ?? []).filter((e) => e && typeof e.key === "string" && e.key);
    let wc = null;
    switch (c.type) {
      case "Image":
      case "Video": {
        const kind = c.type === "Image" ? "image" : "video";
        if (/^blob:/.test(String(c.src ?? "").trim())) warn(id, "src가 blob: 주소라 새 프로젝트에서 안 보일 수 있습니다 (originalSrc의 CDN 주소를 쓰세요)");
        const source = inputFor(c.src, kind, { width: c.source?.width ?? c.transform?.width, height: c.source?.height ?? c.transform?.height, ...(kind === "video" ? { duration: sec(c.timing?.duration) } : {}) });
        wc = { ...base, clipType: kind, source, transform: baseTransform(c) };
        // 픽셀 아트(엔진 3.0.19+) — 앱은 transform.pixelArt { pixelated, spriteSheet }로 받는다. 시트는 이미지만
        const st = c.style ?? {};
        const sheet = kind === "image" && st.spriteSheet && Number(st.spriteSheet.cols) * Number(st.spriteSheet.rows ?? 1) >= 2 ? st.spriteSheet : null;
        if (st.pixelated === true || sheet) {
          const cols = Math.floor(Number(sheet?.cols)), rows = Math.floor(Number(sheet?.rows ?? 1));
          wc.transform.pixelArt = {
            pixelated: st.pixelated === true,
            spriteSheet: sheet ? { cols, rows, count: Math.floor(Number(sheet.count ?? cols * rows)), fps: Number(sheet.fps ?? 8), loop: sheet.loop !== false } : null,
          };
          if (sheet?.from) warn(id, "spriteSheet.from(시작 칸)은 앱 저장 형식에 남지 않아 첫 칸부터 재생됩니다 (애니메이션마다 시트를 따로 만드세요)");
        }
        if (kind === "video" && st.spriteSheet) warn(id, "spriteSheet는 이미지 클립만 됩니다");
        if (kind === "video") {
          wc.sourceStartOffset = sec(c.timing?.trim?.from);
          wc.usesLinkedAudio = c.audio !== false;
          wc.volume = c.volume ?? 1;
        }
        break;
      }
      case "Audio": {
        const source = inputFor(c.src, "audio", { duration: sec(c.timing?.duration) });
        wc = { ...base, clipType: "audio", source, volume: c.volume ?? 1, sourceStartOffset: sec(c.timing?.trim?.from) };
        const fi = c.fadeIn?.duration ?? c.timing?.fadeIn?.duration, fo = c.fadeOut?.duration ?? c.timing?.fadeOut?.duration;
        if (fi) wc.fadeInSec = fi / 1000; // 엔진 페이드는 ms
        if (fo) wc.fadeOutSec = fo / 1000;
        break;
      }
      case "Text": {
        wc = { ...base, clipType: "text", source: "", content: String(c.text ?? ""), transform: textTransform(c) };
        break;
      }
      case "Caption": {
        const cap = c.caption ?? {};
        const words = cap.words ?? [];
        const t = textTransform(c);
        Object.assign(t, { _isCaption: true, _captionWords: words, _captionColors: cap.colors, _captionPositioning: cap.positioning, _captionWordsPerLine: c.wordsPerLine ?? "multiple" });
        if (cap.wordAnimation) warn(id, "Caption wordAnimation(말하는 단어 확대)은 앱에서 보존되지 않습니다");
        wc = { ...base, clipType: "text_segment", source: "", content: words.length ? words.map((w) => w.text).join(" ") : String(c.text ?? ""), transform: t };
        break;
      }
      case "Shape": {
        const style = { ...(c.style ?? {}) };
        let shapeType = c.shapeType;
        if (!shapeType && style.shapeType) { shapeType = style.shapeType; warn(id, `style.shapeType "${style.shapeType}"을 shape.shapeType으로 옮겼습니다 (도형 종류는 클립 최상위에)`); }
        delete style.shapeType;
        shapeType ??= "rectangle";
        // 서버 내보내기는 도형을 SVG 사각형(rx = borderRadius)으로 굽는다. pill은 반지름을 적어 두어야 둥글게 나온다
        const w = c.transform?.width ?? 0, h = c.transform?.height ?? 0;
        if (shapeType === "pill" && style.borderRadius == null) style.borderRadius = Math.min(w, h) / 2;
        if (shapeType === "rounded" && style.borderRadius == null) warn(id, "rounded 도형에 style.borderRadius가 없어 사각형으로 그려집니다");
        wc = { ...base, clipType: "shape", source: "", transform: { ...baseTransform(c), shape: { shapeType, style } } };
        break;
      }
      case "Adapter": {
        const params = { ...(c.params ?? {}) };
        // 앱에 등록된 three 장면: 3D 모델(model)과 3D ↔ 2D 모프(morph, 엔진 3.0.11+)
        if (c.adapter === "script" || (c.adapter === "three" && !APP_THREE_SCENES.has(params.scene ?? "model"))) {
          warn(id, `${c.adapter === "script" ? "script 어댑터" : `three 커스텀 씬 "${params.scene}"`}는 앱에 등록되어 있지 않아 뺐습니다 (영상으로 미리 렌더해 Video 클립으로 넣으세요)`);
          skipped.add(id);
          continue;
        }
        const isModel = c.adapter === "three" && (params.scene ?? "model") === "model";
        if (isModel && !params.src) params.src = c.src; // 앱은 Adapter src를 "lottie"로 덮으므로 모델은 params.src에
        if (isModel && !/^data:/.test(String(params.src ?? ""))) warn(id, "three 모델이 data URL이 아닙니다. 앱 저장본에 모델이 남지 않을 수 있습니다");
        wc = { ...base, clipType: "lottie", source: "", transform: { ...baseTransform(c), adapter: { adapter: c.adapter, params } } };
        break;
      }
      case "Effect": {
        // Effect 클립(자기보다 아래 레이어 전체에 필터) — 앱은 clipType effect + transform.effect { effectKey, values }로 받는다
        if (!c.effectKey) { warn(id, "Effect 클립에 effectKey가 없어 뺐습니다"); skipped.add(id); continue; }
        wc = { ...base, clipType: "effect", source: "", transform: { ...baseTransform(c), effect: { effectKey: c.effectKey, ...(c.values && Object.keys(c.values).length ? { values: c.values } : {}) } } };
        break;
      }
      case "Backdrop":
      case "Placeholder":
        warn(id, `${c.type} 클립은 앱이 받지 않아 뺐습니다 (룩 스택은 motion.mjs lookStack의 Image 클립을 쓰세요)`);
        skipped.add(id);
        continue;
      default:
        warn(id, `모르는 클립 타입 ${c.type}, 뺐습니다`);
        skipped.add(id);
        continue;
    }
    if (anim.length) wc.transform = { ...(wc.transform ?? {}), animation: anim };
    if (clipEffects.length && wc.clipType !== "effect") wc.transform = { ...(wc.transform ?? {}), clipEffects: JSON.parse(JSON.stringify(clipEffects)) };
    // 클립 그룹 — 앱은 멤버마다 transform._clipGroup { id, name, angle }으로 받아 그룹을 다시 만든다
    const gid = typeof c.groupId === "string" ? c.groupId.trim() : "";
    if (gid) {
      const g = p.groups?.[gid] ?? {};
      const meta = { id: gid, ...(g.name ? { name: g.name } : {}), ...(Number.isFinite(g.angle) && g.angle !== 0 ? { angle: g.angle } : {}), ...(g.locked ? { locked: true } : {}) };
      wc.transform = { ...(wc.transform ?? {}), _clipGroup: meta };
    }
    if (c.style?.matte?.clipId) matteTargets.push({ id, wc, matte: c.style.matte });
    clips.push(wc);
  }
  if (!clips.length) continue;
  const types = new Set(clips.map((x) => x.clipType));
  const type = types.has("audio") ? "audio" : [...types].every((t) => t === "text" || t === "text_segment") ? "text" : [...types].every((t) => t === "image") ? "image" : "video";
  let name = trackName;
  if (lane > 0) { name = `${trackName}_l${lane + 1}`; while (usedTrackNames.has(name)) name += "_"; usedTrackNames.add(name); }
  wireTracks.push({ name, type, studioRow: row++, clips });
  }
}

// 트랙 매트 — 앱은 transform.matte { clip: 가리키는 클립 이름, mode, hideSource, feather, threshold, softness }로 받는다(engine 3.0.13+)
const MATTE_MODES = new Set(["alpha", "alphaInverted", "luma", "lumaInverted"]);
for (const { id, wc, matte } of matteTargets) {
  const src = matte.clipId;
  if (src === id || !p.clips[src] || skipped.has(src)) { warn(id, `style.matte의 매트 클립 "${src}"이 없거나 빠져서 매트를 뺐습니다 (매트 없이 그대로 보임)`); continue; }
  const out = { clip: clipName(src) };
  if (MATTE_MODES.has(matte.mode)) out.mode = matte.mode;
  for (const k of ["hideSource", "feather", "threshold", "softness"]) if (matte[k] != null) out[k] = matte[k];
  wc.transform = { ...(wc.transform ?? {}), matte: out };
}

// ③ 전환
const transitions = [];
for (const [id, c] of Object.entries(p.clips)) {
  if (c.type !== "Transition") continue;
  if (skipped.has(c.fromClipId) || skipped.has(c.toClipId)) { warn(id, "전환의 앞뒤 클립이 빠져서 전환도 뺐습니다"); continue; }
  const key = c.transitionKey ?? "fade";
  const type = TRANSITION_TO_WIRE[key] ?? AM_TRANSITION_XFADE[key] ?? String(key).toLowerCase();
  // 앱은 transitions[].engine { key, values, easing }을 엔진 전환 키로 그대로 쓴다(앱 미리보기·브라우저 내보내기). type은 서버 인코딩(xfade)용 이름
  const values = c.values && typeof c.values === "object" && Object.keys(c.values).length ? c.values : null;
  const engine = !TRANSITION_TO_WIRE[key] || values || c.easing ? { key, ...(values ? { values } : {}), ...(c.easing ? { easing: c.easing } : {}) } : null;
  if (/^hf-/.test(key)) warn(id, `전환 "${key}"(셰이더 팩)는 앱에 등록되어 있지 않아 앱에서는 fade로 보입니다. 앱으로 넘길 광고는 am-* 전환·트랙 매트·마스크 전환을 쓰세요 (transitions.md)`);
  else if (AM_TRANSITION_XFADE[key]) warn(id, `전환 "${key}"는 앱 미리보기·브라우저 내보내기에서 그대로(values·easing 포함) 보이고, 서버 인코딩에서만 "${type}"(xfade)로 바뀝니다`);
  else if (!TRANSITION_TO_WIRE[key]) warn(id, `전환 "${key}"는 엔진 키 그대로 넘깁니다. 앱 전환 탭에 있는 이름인지 확인하세요`);
  // 앱과 같은 규칙: 두 클립이 겹치면 crossover, 아니면 freeze_overlay (engine-recipes §5.2)
  const fa = p.clips?.[c.fromClipId]?.timing?.display, tb = p.clips?.[c.toClipId]?.timing?.display;
  const mode = fa && tb && Math.min(fa.to, tb.to) > Math.max(fa.from, tb.from) ? "crossover" : "freeze_overlay";
  if (mode === "freeze_overlay" && fa && tb) warn(id, `전환 양쪽 소재가 겹치지 않아 앱에서는 앞 소재 끝으로 옮겨지고 다음 소재가 첫 프레임에 멈춥니다. 전환 길이만큼 겹치세요 (engine-recipes §5.2)`);
  transitions.push({ id, type, duration: sec(c.timing?.duration ?? (c.timing?.display?.to - c.timing?.display?.from)), from: c.fromClipId ?? "", to: c.toClipId ?? "", mode, ...(engine ? { engine } : {}) });
}

const wire = {
  version: "1.0",
  track_type: "json_to_ffmpeg",
  inputs,
  tracks: wireTracks,
  transitions,
  output: { width: W, height: H, framerate: FPS, format: "mp4", startPosition: 0, endPosition: sec(S.duration), fileName: p.name ?? "admaker-skill" },
  admaker_meta: { creationMode: "studio", last_entry_mode: "studio" },
};
fs.writeFileSync(outFile, JSON.stringify(wire, null, 2));
const n = wireTracks.reduce((a, t) => a + t.clips.length, 0);
console.log(`${outFile}: 트랙 ${wireTracks.length}개, 클립 ${n}개, 입력 ${inputs.length}개, 전환 ${transitions.length}개`);
if (warnings.length) console.log(warnings.join("\n"));
