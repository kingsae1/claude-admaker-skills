// project.json + admaker-import.json → admaker 플래너 모드 템플릿(template.json)
// 사용: node to-admaker-template.mjs [project.json] [admaker-import.json] [out=template.json]
//         [--group 그룹이름] [--name 템플릿이름] [--desc "설명"] [--from 초] [--to 초] [--keep-look]
//         [--scene-transition am-push:0.35 | none] [--beats 8 [--bpm 128]] [--colors "#E63B2E,#1F4FD8"] [--font NotoSansKR-Black.ttf]
// 플래너 템플릿은 "씬 위에 얹는 오버레이"다. 씬의 영상·사진은 앱이 깔고, 템플릿은 그 위의 글자·도형·이미지만 가진다.
// 그래서 바닥 소재(FOOTAGE, footage_*)와 배경 트랙은 빼고, 룩 레이어(look_*)도 기본으로 뺀다.
// 앱이 템플릿을 쓰는 방식(references/engine-recipes.md §9.1):
//  - 템플릿 캔버스 → 씬 캔버스로 x·y를 따로 늘린다. 광고와 같은 비율로 만든다.
//  - 템플릿 길이 → 씬 길이로 모든 시간(시작·길이·애니메이션)을 같은 비율로 늘린다.
//  - 클립 이름이 표준 필드(store_name, phone, logo …)면 그 값으로 바꾼다. 글자 안의 {{marker}}는 multi_ 클립에서 바뀐다.
//  - 클립 이름 "subtitle"은 씬 자막 자리로 쓰인다.
//  - 겹침 순서는 트랙 순서(앞 = 아래)다.
import fs from "node:fs";

const argv = process.argv.slice(2);
const pos = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && argv[i - 1] !== "--keep-look"));
// 앱이 씬 경계에서 고르는 전환(planSceneTransitions.ts)에 쓰이는 엔진 전환 키. am-* 12종 + 기본 페이드
const SCENE_TRANSITION_KEYS = new Set(["fade", "none", "am-flash-streak", "am-cover-flood", "am-zoom-through", "am-card-swap", "am-push",
  "am-cut-curve", "am-zoom-blur", "am-rack-focus", "am-light-leak", "am-pixelate", "am-rgb-split", "am-ink-bleed"]);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const [projFile = "project.json", wireFile = "admaker-import.json", outFile = "template.json"] = pos;
const p = JSON.parse(fs.readFileSync(projFile, "utf8"));
const wire = JSON.parse(fs.readFileSync(wireFile, "utf8"));
const keepLook = argv.includes("--keep-look");
const S = p.settings ?? {};
const W = S.width ?? 1080, H = S.height ?? 1920;
const total = (S.duration ?? 0) / 1e6;
const from = Number(opt("from", 0)), to = Number(opt("to", total));
const warnings = [];
const warn = (id, m) => warnings.push(`△ ${id}: ${m}`);

// 앱의 표준 필드 키 (VIDEO_TEMPLATE_SPEC §5). 번호 붙은 키(menu_name_2 등)는 기본형으로 맞춘다
const FIELD_KEYS = new Set(["subtitle", "store_name", "location", "phone", "business_hours", "business_category", "tagline", "promo_title", "promo_price", "promo_period", "badge", "cta", "menu_name", "menu_price", "menu_image", "logo", "qr", "store_image", "subtitle_bg", "store_name_bg", "location_bg", "phone_bg", "badge_bg", "promo_title_bg", "cta_bg", "info_bar_bg", "logo_bg", "bg_image", "overlay", "frame", "deco", "website", "sns_handle"]);
const isField = (k) => FIELD_KEYS.has(String(k).replace(/_\d+$/, ""));

// 폰트: 앱 템플릿은 fontName에 폰트 "파일명"을 쓴다(앱이 레지스트리 fontUrl의 파일명으로 찾음)
let FONTS = [];
for (const rel of ["./fonts.json", "../references/fonts.json"]) {
  const url = new URL(rel, import.meta.url);
  if (fs.existsSync(url)) { FONTS = JSON.parse(fs.readFileSync(url, "utf8")).fonts; break; }
}
const basename = (u) => decodeURIComponent(String(u).split(/[\\/]/).pop().split("?")[0]);
function templateFontName(t, id) {
  const fam = t.fontName;
  const f = FONTS.find((x) => x.name === fam);
  // 눈누 계열(legacy)은 앱 /fonts 파일명, Google 계열(legacy-google)은 앱이 cssName으로도 찾으므로 이름 그대로
  if (f && f.source === "legacy" && t.fontUrl) {
    // 앱 레지스트리는 패밀리마다 파일 하나(derived 아닌 변형)만 안다. 굵은 파생 파일(Paperlogy-7Bold 등)을 적으면 앱이 못 찾으므로
    // 기본 파일 이름으로 적고 굵기는 isBold로 넘긴다(to-admaker-import가 _weight → isBold)
    const file = basename(t.fontUrl);
    const v = f.variants.find((x) => basename(x.url) === file);
    if (v?.derived) {
      const base = f.variants.find((x) => !x.derived);
      if (base) {
        if ((v.weight ?? 400) >= 600) t.isBold = true;
        warn(id, `"${fam}" ${v.weight} 파일(${file})은 앱 레지스트리에 없어 기본 파일 ${basename(base.url)} + isBold로 적었습니다(가짜 볼드가 될 수 있음). 굵은 한글은 --font NotoSansKR-Black.ttf처럼 앱에 파일이 따로 있는 폰트로 바꾸세요`);
        return basename(base.url);
      }
    }
    return file;
  }
  if (f && f.source === "legacy-google") return fam;
  if (!f) warn(id, `폰트 "${fam}"이 fonts.json에 없음`);
  else warn(id, `Latin 폰트 "${fam}"는 템플릿 렌더 서버에 있는지 확인 필요(앱 캔버스는 표시됨)`);
  return fam;
}

const skippedNames = new Set();
const usedNames = new Set();
const uniqueName = (n) => { let k = n, i = 2; while (usedNames.has(k)) k = `${n}_${i++}`; usedNames.add(k); return k; };
const fieldsUsed = new Set();
let subtitleTaken = false;

const tracks = [];
// import 파일은 위 트랙이 먼저(studioRow 0). 템플릿은 그리는 순서(아래 → 위)라 뒤집는다
for (const track of [...wire.tracks].reverse()) {
  if (track.name === "track_bg") continue;
  const clips = [];
  for (const c of track.clips) {
    const id = c.name;
    const ec = p.clips?.[id] ?? {};
    if (id.startsWith("footage_") || ec.role === "footage") { skippedNames.add(id); continue; }
    if (id.startsWith("look_") && !keepLook) { skippedNames.add(id); continue; }
    if (c.clipType === "audio") { warn(id, "템플릿은 소리를 갖지 않아 뺐습니다(앱이 BGM·내레이션을 따로 깜)"); continue; }
    const s0 = c.timelineTrackStart ?? 0, e0 = s0 + (c.duration ?? 0);
    if (e0 <= from || s0 >= to) continue;
    if (s0 < from) warn(id, `구간 시작(${from}초)보다 먼저 시작한 클립이라 앞부분 모션이 어긋날 수 있음`);
    const n = structuredClone(c);
    n.timelineTrackStart = Math.round((Math.max(s0, from) - from) * 1000) / 1000;
    n.duration = Math.round((Math.min(e0, to) - Math.max(s0, from)) * 1000) / 1000;
    const t = n.transform ?? (n.transform = {});
    delete t.zIndex; // 겹침은 트랙 순서로
    t.rotation = { angle: t.rotation?.angle ?? 0, origin: "center" };

    // 이름: field 표시 > 자막 > {{marker}} 글자 > 원래 id
    let name = id;
    const isText = c.clipType === "text" || c.clipType === "text_segment";
    if (ec.field) {
      if (!isField(ec.field)) warn(id, `field "${ec.field}"는 앱 표준 필드가 아님`);
      fieldsUsed.add(ec.field.replace(/_\d+$/, ""));
      // 글자 필드는 앱 관례대로 multi_<field> + {{field}}로 쓴다. 앱은 {{marker}}로만 "이 템플릿이 그 정보를 요구한다"를 알고
      // (overlayTemplateRequirements), 값이 비었을 때 예시 문구가 그대로 나가지 않는다. 렌더용 예시 문구는 project.json에만 남는다
      name = isText ? `multi_${ec.field}` : ec.field;
    } else if (ec.type === "Caption" && !subtitleTaken) {
      name = "subtitle"; subtitleTaken = true; fieldsUsed.add("subtitle");
    } else if (/\{\{\w+\}\}/.test(c.content ?? "")) {
      name = `multi_${id}`;
      for (const m of String(c.content).matchAll(/\{\{(\w+)\}\}/g)) { fieldsUsed.add(m[1].replace(/_\d+$/, "")); if (!isField(m[1])) warn(id, `{{${m[1]}}}는 앱 표준 필드가 아니라 채워지지 않음`); }
    } else if (isField(id)) {
      warn(id, `클립 id가 표준 필드 이름과 같아 앱이 값을 바꿔 넣습니다. 의도가 아니면 id를 바꾸세요`);
    }
    n.name = uniqueName(name);

    if (c.clipType === "text" || c.clipType === "text_segment") {
      // 템플릿 글자는 source에 들어간다(줄바꿈은 \N)
      n.source = ec.field ? `{{${ec.field}}}` : String(c.content ?? "").replace(/\r?\n/g, "\\N");
      delete n.content;
      // --font: 앱 /fonts 파일명으로 모든 글자 폰트를 바꾼다(렌더 확인은 같은 파일로 따로 한다). 굵은 파일이면 isBold도 켠다
      if (opt("font")) { t.fontName = opt("font"); if (/(Bold|Black|Heavy|ExtraBold)/i.test(t.fontName)) t.isBold = true; }
      else if (t.fontName) t.fontName = templateFontName(t, id);
      delete t.fontUrl;
      for (const k of Object.keys(t)) if (k.startsWith("_caption") || k === "_isCaption") delete t[k];
      if (t.textShadow && t.textShadow.color && !t.textShadow.shadowColor) {
        const sh = t.textShadow; // 엔진 shadow → 템플릿 textShadow
        const a = Math.round(Math.max(0, Math.min(1, sh.alpha ?? 1)) * 255).toString(16).padStart(2, "0").toUpperCase();
        t.textShadow = { offsetX: sh.offsetX ?? 0, offsetY: sh.offsetY ?? 0, blurRadius: sh.blur ?? 0, shadowColor: `${String(sh.color).slice(0, 7).toUpperCase()}${a}` };
      }
    }
    clips.push(n);
  }
  if (!clips.length) continue;
  const { studioRow, ...rest } = track;
  tracks.push({ ...rest, clips });
}

const usedInputs = new Set(tracks.flatMap((t) => t.clips.map((c) => c.source)).filter(Boolean));
const inputs = wire.inputs.filter((i) => usedInputs.has(i.name));
const dur = Math.round((to - from) * 1000) / 1000;
const need = [...fieldsUsed].filter((k) => k !== "subtitle");
const desc = [opt("desc", "admaker 스킬로 만든 모션 그래픽 오버레이."),
  need.length ? `필요 요소: ${need.join(", ")}.` : "필요 요소: 없음(고정 문구).",
  `기준 캔버스 ${W}x${H}, ${dur}초.`].join("\n");

const template = {
  version: "1.0",
  groupName: opt("group", "admaker-skill"),
  templateName: opt("name", p.name ?? "템플릿-1"),
  description: desc,
  track_type: "json_to_ffmpeg",
  inputs,
  tracks,
  transitions: [],
  output: { device: "gpu", fileName: "output", format: "mp4", framerate: wire.output?.framerate ?? S.fps ?? 30, width: W, height: H, startPosition: 0, endPosition: dur, addSegmentEncoding: [] },
};
// 주 컬러(앱 3단계 "공통 변수"에서 유저가 바꾸는 기준 색, templateColors.ts). 템플릿 안 hex 색이 이 색과의 관계를 지킨 채 옮겨진다
const colorsOpt = opt("colors");
if (colorsOpt) {
  const [primary, secondary] = colorsOpt.split(",").map((c) => c.trim().toUpperCase());
  const ok = (c) => /^#[0-9A-F]{6}$/.test(c ?? "");
  if (!ok(primary) || (secondary && !ok(secondary))) warn("colors", `--colors ${colorsOpt}는 #RRGGBB[,#RRGGBB] 형식이 아님`);
  else template.colorRoles = secondary ? { primary, secondary } : { primary };
}
// 이 씬을 떠날 때의 전환(앱: 같은 그룹 안에서 역할이 바뀔 때, 오프닝을 떠날 때 씀)
const st = opt("scene-transition");
if (st) {
  const [key, secRaw] = st.split(":");
  if (!SCENE_TRANSITION_KEYS.has(key) && !key.startsWith("hf-")) warn("sceneTransition", `"${key}"는 앱이 아는 전환 키가 아닐 수 있음(앱이 모르면 짧은 페이드로 바뀜)`);
  const sec = Number(secRaw ?? 0.4);
  if (key === "none") template.sceneTransition = { key: "none" };
  else {
    if (!(sec > 0 && sec <= 1)) warn("sceneTransition", `길이 ${secRaw}초는 0–1초 밖이라 앱이 고쳐 씀`);
    template.sceneTransition = { key, durationSec: Math.min(1, Math.max(0.05, sec)) };
    if (sec > dur * 0.4) warn("sceneTransition", `전환 ${sec}초가 씬 길이 ${dur}초의 40%를 넘음. 앱은 짧은 씬 쪽에 맞춰 줄임`);
  }
}
// 박 길이 표시: 앱이 BGM 박에 씬 길이를 맞출 때 이 템플릿을 몇 박 단위로 늘리거나 줄일지 정함
const beats = opt("beats");
if (beats) {
  const n = Number(beats);
  if (!(Number.isInteger(n) && n > 0)) warn("beats", `--beats ${beats}는 양의 정수가 아님`);
  else {
    template.beats = n;
    const bpm = Number(opt("bpm", 0));
    if (bpm > 0) {
      template.bpm = bpm;
      const expect = (n * 60) / bpm;
      if (Math.abs(expect - dur) > 1 / (template.output.framerate || 30)) warn("beats", `${n}박 × ${bpm} BPM = ${expect.toFixed(3)}초인데 구간은 ${dur}초. --from/--to를 박에 맞추세요`);
    }
  }
}
// 플래너 전환은 앞 씬 끝에 겹침(freeze_overlay): 그래픽 퇴장은 끝 - 전환 길이 전에 끝나야 전환에 가리지 않음
if (template.sceneTransition?.durationSec) {
  const cutAt = dur - template.sceneTransition.durationSec;
  const late = tracks.flatMap((t) => t.clips).filter((c) => (c.timelineTrackStart ?? 0) > cutAt + 1e-3);
  if (late.length) warn("sceneTransition", `전환이 시작된 뒤(${cutAt.toFixed(2)}초 이후)에 나타나는 클립: ${late.map((c) => c.name).join(", ")}`);
}
if ((wire.transitions ?? []).length) warn("transitions", "템플릿은 전환을 갖지 않아 뺐습니다(씬 사이 전환은 앱이 정함)");
if (skippedNames.size) console.log(`빠진 클립(바닥 소재·룩): ${[...skippedNames].join(", ")}`);
if (dur > 8) warn("template", `${dur}초는 씬 하나로 깁니다. 앱은 템플릿 시간을 씬 길이에 맞춰 늘리거나 줄이므로 --from/--to로 씬 단위(1.5–6초)로 나누세요`);

fs.writeFileSync(outFile, JSON.stringify(template, null, 2));
const nClips = tracks.reduce((a, t) => a + t.clips.length, 0);
console.log(`${outFile}: 트랙 ${tracks.length}개, 클립 ${nClips}개, 입력 ${inputs.length}개, ${dur}초, ${W}x${H}${need.length ? `, 필드 ${need.join("·")}` : ""}`);
if (warnings.length) console.log(warnings.join("\n"));
