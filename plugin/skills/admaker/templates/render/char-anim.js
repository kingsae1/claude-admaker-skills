// 글자 단위 애니메이션(style.characterAnimation)을 로컬 렌더에서도 그린다.
// 엔진 Exporter·Preview의 Text 클립은 characterAnimation을 그리지 않는다(앱은 text_segment 렌더러로 따로 그림).
// 그래서 렌더 직전에 그런 Text 클립만 같은 렌더러(@admaker/engine/text-segment)를 쓰는 script 어댑터 클립으로 바꾼다.
// project.json(앱 불러오기 원본)은 그대로이고, 렌더 하니스 안에서만 바뀐다.
import { layoutTextSegment, renderSegmentGlyphsAtTime, drawTextSegmentFrame } from "@admaker/engine/text-segment";
import { registerScript } from "@admaker/engine";

const cache = new Map();
function render(ctx, { width, height, time, params }) {
  const key = `${params.key}|${width}x${height}`;
  let layout = cache.get(key);
  if (!layout) {
    layout = layoutTextSegment({ text: params.text, transform: params.transform, boxWidth: width, boxHeight: height });
    cache.set(key, layout);
  }
  const glyphs = renderSegmentGlyphsAtTime({
    text: params.text, transform: params.transform, boxWidth: width, boxHeight: height,
    clipStart: 0, playhead: time, clipDuration: params.duration, layout,
  });
  drawTextSegmentFrame(ctx, { width, height, transform: params.transform, layout, glyphs });
}
registerScript("__char_anim", render, { fps: 60 });

/** 엔진 Text style → text_segment transform (to-admaker-import.mjs의 Text 변환과 같은 키) */
function segmentTransform(s) {
  const t = {
    fontName: s.fontFamily ?? "sans-serif",
    fontSize: Number(s.fontSize) || 48,
    color: s.color ?? s.fill ?? "#ffffff",
    align: s.align ?? "center",
    verticalAlign: s.verticalAlign === "center" || !s.verticalAlign ? "middle" : s.verticalAlign,
    opacity: 1,
  };
  if (s.letterSpacing) t.letterSpacing = Number(s.letterSpacing);
  if (s.lineHeight != null && s.fontSize) t.lineSpacing = Number(s.fontSize) * (Number(s.lineHeight) - 1);
  if (s.fontStyle === "italic") t.isItalic = true;
  if (s.stroke && Number(s.stroke.width) > 0) { t.textStrokeWidth = Number(s.stroke.width); if (s.stroke.color) t.textStrokeColor = String(s.stroke.color); }
  if (s.shadow) t.textShadow = s.shadow;
  if (typeof s.background === "string") t.boxColor = s.background;
  for (const k of ["characterAnimation", "characterStyles", "characterShove", "animationBox", "lineBoxes", "charPerspective", "charBackface"]) if (s[k] !== undefined) t[k] = s[k];
  return t;
}

const loaded = new Set();
async function loadFace(family, url) {
  const key = `${family}|${url}`;
  if (!url || loaded.has(key) || typeof FontFace === "undefined") return;
  loaded.add(key);
  try {
    const face = new FontFace(family, `url(${url})`);
    await face.load();
    document.fonts.add(face);
  } catch (e) {
    console.warn(`[char-anim] 폰트를 못 불러옴 ${family}: ${e?.message ?? e}`);
  }
}

/** characterAnimation이 있는 Text 클립을 script 어댑터 클립으로 바꾼 사본. 바꿀 것이 없으면 원본 그대로 */
export async function withCharacterAnimation(project) {
  const clips = project?.clips ?? {};
  const ids = Object.keys(clips).filter((id) => {
    const c = clips[id];
    return c?.type === "Text" && Array.isArray(c.style?.characterAnimation) && c.style.characterAnimation.length;
  });
  if (!ids.length) return project;
  const out = { ...project, clips: { ...clips }, tracks: (project.tracks ?? []).map((t) => ({ ...t })) };
  for (const id of ids) {
    const c = clips[id];
    const s = c.style ?? {};
    await loadFace(s.fontFamily, s.fontUrl);
    const dur = Number(c.timing?.duration ?? (c.timing?.display?.to - c.timing?.display?.from)) / 1e6;
    const textEdits = (c.animations ?? []).filter((a) => ["scramble", "typewrite", "countUp", "charWave"].includes(a?.type));
    if (textEdits.length) console.warn(`[char-anim] ${id}: characterAnimation과 ${textEdits.map((a) => a.type).join(", ")}는 함께 그려지지 않아 글자 모션만 씁니다`);
    out.clips[id] = {
      id: c.id ?? id, name: c.name ?? id, type: "Adapter", adapter: "script", src: "script",
      timing: c.timing, transform: c.transform,
      animations: (c.animations ?? []).filter((a) => !textEdits.includes(a)),
      ...(s.matte ? { style: { matte: s.matte } } : {}),
      params: { name: "__char_anim", key: id, text: c.text ?? "", duration: dur, transform: segmentTransform(s) },
    };
    for (const t of out.tracks) if ((t.clipIds ?? []).includes(id)) t.type = "Adapter";
  }
  if (document.fonts?.ready) await document.fonts.ready;
  return out;
}
