// project.json + admaker-import.json → admaker 플래너 모드 템플릿(template.json)
// 사용: node to-admaker-template.mjs [project.json] [admaker-import.json] [out=template.json]
//         [--group 그룹이름] [--name 템플릿이름] [--desc "설명"] [--from 초] [--to 초] [--keep-look]
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
  if (f && f.source === "legacy" && t.fontUrl) return basename(t.fontUrl);
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
    if (ec.field) {
      if (!isField(ec.field)) warn(id, `field "${ec.field}"는 앱 표준 필드가 아님`);
      name = ec.field; fieldsUsed.add(ec.field.replace(/_\d+$/, ""));
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
      n.source = String(c.content ?? "").replace(/\r?\n/g, "\\N");
      delete n.content;
      if (t.fontName) t.fontName = templateFontName(t, id);
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
if ((wire.transitions ?? []).length) warn("transitions", "템플릿은 전환을 갖지 않아 뺐습니다(씬 사이 전환은 앱이 정함)");
if (skippedNames.size) console.log(`빠진 클립(바닥 소재·룩): ${[...skippedNames].join(", ")}`);
if (dur > 8) warn("template", `${dur}초는 씬 하나로 깁니다. 앱은 템플릿 시간을 씬 길이에 맞춰 늘리거나 줄이므로 --from/--to로 씬 단위(1.5–6초)로 나누세요`);

fs.writeFileSync(outFile, JSON.stringify(template, null, 2));
const nClips = tracks.reduce((a, t) => a + t.clips.length, 0);
console.log(`${outFile}: 트랙 ${tracks.length}개, 클립 ${nClips}개, 입력 ${inputs.length}개, ${dur}초, ${W}x${H}${need.length ? `, 필드 ${need.join("·")}` : ""}`);
if (warnings.length) console.log(warnings.join("\n"));
