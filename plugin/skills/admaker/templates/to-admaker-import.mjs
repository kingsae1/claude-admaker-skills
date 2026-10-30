// project.json(엔진 ProjectJSON) → admaker 앱 "광고 불러오기" 파일(EncodingPayload wire JSON)
// 사용: node to-admaker-import.mjs [project.json] [out=admaker-import.json]
// 앱은 엔진 ProjectJSON을 직접 받지 않고 inputs·tracks·output·admaker_meta 형식만 받는다.
// 앱에 대응이 없는 것은 경고와 함께 빼거나 바꾼다(references/engine-recipes.md §9). 앱 코드를 복사하지 않고 형식만 맞춘다.
import fs from "node:fs";

const [inFile = "project.json", outFile = "admaker-import.json"] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(inFile, "utf8"));
const S = p.settings ?? {};
const W = S.width ?? 1080, H = S.height ?? 1920, FPS = S.fps ?? 30;
const sec = (us) => Math.round((Number(us) || 0) / 1000) / 1000;
const warnings = [];
const warn = (id, m) => warnings.push(`△ ${id}: ${m}`);

// 앱이 그대로 엔진 모션으로 넘기는 type (그 밖의 type은 앱이 버린다)
const EP_MOTION_TYPES = new Set(["keyframes", "shake", "unfold", "fold", "strokeDraw", "paint", "countUp", "wipe", "circleReveal", "rectExpand", "angleWipe", "starReveal", "centerExpand", "blockReveal", "gsapTimeline"]);
// 앱이 xfade 이름으로 내보내는 전환 (엔진 key → wire type)
const TRANSITION_TO_WIRE = { fadeIn: "fade", fadeOut: "fade", fade: "fade", zoomIn: "zoomin", slideLeft: "slideleft", slideRight: "slideright", slideUp: "slideup", slideDown: "slidedown", wipeLeft: "wipeleft", wipeRight: "wiperight", coverRight: "coverright", coverLeft: "coverleft", coverUp: "coverup", coverDown: "coverdown" };
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
    out.push({ type: a.type, start: sec(o.delay), duration: sec(o.duration), easing: o.easing ?? "linear", iterCount: Math.max(1, Math.round(o.iterCount ?? 1)), params: { ...(a.params ?? {}) } });
  }
  return out;
}

function baseTransform(clip) {
  const t = clip.transform ?? {};
  const out = { x: t.x ?? 0, y: t.y ?? 0, width: t.width ?? 0, height: t.height ?? 0, opacity: t.opacity ?? 1, rotation: { angle: t.angle ?? 0 } };
  if (Number.isFinite(t.zIndex)) out.zIndex = Z_BASE + t.zIndex;
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

// ① 배경 트랙: 앱은 track_bg의 단색 SVG를 settings.backgroundColor로 읽는다
const bgColor = S.backgroundColor ?? "#000000";
const bgInput = inputFor(`<svg width='${W}' height='${H}' viewBox='0 0 ${W} ${H}' xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='${bgColor}'/></svg>`, "image");
wireTracks.push({ name: "track_bg", type: "image", clips: [{ name: "bg", clipType: "image", source: bgInput, timelineTrackStart: 0, duration: sec(S.duration), transform: { x: 0, y: 0, width: W, height: H, opacity: 1, rotation: { angle: 0 } } }] });

// ② 트랙: 엔진 트랙마다 하나. 행 순서는 클립 zIndex가 높은 트랙이 위(studioRow 0)
const engineTracks = (p.tracks ?? []).filter((t) => t.type !== "Transition");
const topZ = (t) => Math.max(0, ...t.clipIds.map((id) => p.clips[id]?.transform?.zIndex ?? 0));
const ordered = [...engineTracks].sort((a, b) => topZ(b) - topZ(a));

for (const [row, track] of ordered.entries()) {
  const clips = [];
  for (const id of track.clipIds) {
    const c = p.clips[id];
    if (!c) continue;
    const d = c.timing?.display ?? { from: 0, to: 0 };
    const base = { name: clipName(id), timelineTrackStart: sec(d.from), duration: sec(d.to - d.from) };
    const anim = animationsToWire(id, c);
    if (c.effects?.length) warn(id, "clip.effects(클립 필터)는 앱이 받지 않아 뺐습니다 (세로 모션 블러 등)");
    let wc = null;
    switch (c.type) {
      case "Image":
      case "Video": {
        const kind = c.type === "Image" ? "image" : "video";
        const source = inputFor(c.src, kind, { width: c.source?.width ?? c.transform?.width, height: c.source?.height ?? c.transform?.height, ...(kind === "video" ? { duration: sec(c.timing?.duration) } : {}) });
        wc = { ...base, clipType: kind, source, transform: baseTransform(c) };
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
        wc = { ...base, clipType: "shape", source: "", transform: { ...baseTransform(c), shape: { shapeType: c.shapeType ?? "rectangle", style: { ...(c.style ?? {}) } } } };
        break;
      }
      case "Adapter": {
        const params = { ...(c.params ?? {}) };
        if (c.adapter === "script" || (c.adapter === "three" && (params.scene ?? "model") !== "model")) {
          warn(id, `${c.adapter === "script" ? "script 어댑터" : `three 커스텀 씬 "${params.scene}"`}는 앱에 등록되어 있지 않아 뺐습니다 (영상으로 미리 렌더해 Video 클립으로 넣으세요)`);
          skipped.add(id);
          continue;
        }
        if (c.adapter === "three" && !params.src) params.src = c.src; // 앱은 Adapter src를 "lottie"로 덮으므로 모델은 params.src에
        if (c.adapter === "three" && !/^data:/.test(String(params.src ?? ""))) warn(id, "three 모델이 data URL이 아닙니다. 앱 저장본에 모델이 남지 않을 수 있습니다");
        wc = { ...base, clipType: "lottie", source: "", transform: { ...baseTransform(c), adapter: { adapter: c.adapter, params } } };
        break;
      }
      case "Effect":
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
    clips.push(wc);
  }
  if (!clips.length) continue;
  const types = new Set(clips.map((x) => x.clipType));
  const type = types.has("audio") ? "audio" : [...types].every((t) => t === "text" || t === "text_segment") ? "text" : [...types].every((t) => t === "image") ? "image" : "video";
  wireTracks.push({ name: `track_${String(track.name ?? track.id).replace(/^t_/, "").replace(/[^\w-]/g, "_")}`, type, studioRow: row, clips });
}

// ③ 전환
const transitions = [];
for (const [id, c] of Object.entries(p.clips)) {
  if (c.type !== "Transition") continue;
  if (skipped.has(c.fromClipId) || skipped.has(c.toClipId)) { warn(id, "전환의 앞뒤 클립이 빠져서 전환도 뺐습니다"); continue; }
  const key = c.transitionKey ?? "fade";
  const type = TRANSITION_TO_WIRE[key] ?? String(key).toLowerCase();
  if (!TRANSITION_TO_WIRE[key]) warn(id, `전환 "${key}"는 앱에서 이름 그대로 넘깁니다. 앱에서 지원하는지 확인하세요`);
  transitions.push({ id, type, duration: sec(c.timing?.duration ?? (c.timing?.display?.to - c.timing?.display?.from)), from: c.fromClipId ?? "", to: c.toClipId ?? "", mode: "crossover" });
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
