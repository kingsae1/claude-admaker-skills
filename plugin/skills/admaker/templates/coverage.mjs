// 기법 연결 검사: 엔진·앱 기법이 기획 메뉴(모션 방향, 샷 카드, 기법 메뉴, 변주 칸)에 걸려 있는지 본다.
// 메뉴에 없는 기법은 기획안에 나오지 않으니, 엔진 기능을 스킬에 넣으면 이 검사가 통과할 때까지 메뉴에 연결한다 (references/variety.md).
// 사용: node coverage.mjs [--strict]   (--strict면 엔진 필터·모션 타입·am-* 전환이 하나라도 빠졌을 때도 실패)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AXES } from "./variety-core.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const skill = path.join(here, "..");
const read = (f) => fs.readFileSync(path.join(skill, f), "utf8");
const strict = process.argv.includes("--strict");

const menus = {
  directions: read("references/motion-directions.md"),
  shots: fs.readdirSync(path.join(skill, "references/shots")).filter((f) => f.endsWith(".md")).map((f) => read(`references/shots/${f}`)).join("\n"),
  techniques: read("references/techniques.md"),
  variety: AXES.flatMap((a) => a.options.map((o) => `${o.id} ${o.label} ${o.how}`)).join("\n"),
};

// 기법마다 메뉴에서 찾을 낱말(하나라도 걸리면 그 메뉴에 연결된 것). 새 엔진 기능을 넣으면 여기에도 한 줄 더한다.
const TECHNIQUES = [
  { label: "키네틱 타이포", words: ["kinetic-typo-beat"] },
  { label: "글자 단위 3D", words: ["characterAnimation", "글자 단위 3D"] },
  { label: "마스크 와이프", words: ["wipe", "마스크"] },
  { label: "숫자 카운트", words: ["price-countup", "countUp"] },
  { label: "지도", words: ["map-route-draw", "map-region-pin"] },
  { label: "손글씨·라인 보일", words: ["handwritten-title", "lineBoil"] },
  { label: "손그림 강조", words: ["hand-drawn-emphasis", "draw_annotation"] },
  { label: "윤곽선 레터링", words: ["text_to_path", "윤곽선"] },
  { label: "스쿼시 바운스", words: ["squash-bounce"] },
  { label: "아이소메트릭", words: ["iso-build-up"] },
  { label: "리퀴드", words: ["liquid-blobs"] },
  { label: "파티클", words: ["particle-logo"] },
  { label: "3D 카드 기울임", words: ["hero-tilt-push", "transition-footage-card"] },
  { label: "Z축 깊이", words: ["z-fly-through", "transform3d"] },
  { label: "3D↔2D 모프", words: ["morph-reveal", "Morph3D"] },
  { label: "픽셀 아트", words: ["pixel-sprite-hop", "spriteSheet", "pixelated"] },
  { label: "글리치", words: ["glitch-hit", "glitchFilter"] },
  { label: "RGB 분리", words: ["rgbSplit", "RGB 분리"] },
  { label: "클립 그룹", words: ["group-build", "groupId"] },
  { label: "Lottie", words: ["lottie-accent", "search_lottie"] },
  { label: "하프톤·인쇄 질감", words: ["하프톤", "dotFilter", "halftone"] },
  { label: "잉크 번짐", words: ["am-ink-bleed", "잉크 번짐"] },
  { label: "트랙 매트", words: ["style.matte", "트랙 매트", "글자 속으로"] },
  { label: "플래시 전환", words: ["transition-flash-streak", "am-flash-streak"] },
  { label: "덮기 전환", words: ["transition-cover-flood", "am-cover-flood"] },
  { label: "줌 스루 전환", words: ["transition-zoom-through", "am-zoom-through"] },
  { label: "카드 넘김", words: ["am-card-swap", "card-swap"] },
  { label: "밀어내기", words: ["am-push"] },
  { label: "픽셀화 전환", words: ["pixelize"] },
  { label: "카메라 무브", words: ["카메라", "zoom"] },
];

const where = (words) => Object.entries(menus).filter(([, text]) => words.some((w) => text.includes(w))).map(([k]) => k);
let missing = 0;
console.log("기법".padEnd(16), "방향 샷 메뉴 변주");
for (const t of TECHNIQUES) {
  const w = where(t.words);
  const mark = (k) => (w.includes(k) ? " ○ " : " ✗ ");
  // 기획안에 나오려면 방향에 걸리거나, 샷 카드와 기법 메뉴·변주 칸 중 하나에 같이 걸려야 한다
  const ok = w.includes("directions") || (w.includes("shots") && (w.includes("techniques") || w.includes("variety")));
  if (!ok) missing++;
  console.log(`${ok ? " " : "✗"} ${t.label.padEnd(14)}${mark("directions")}${mark("shots")}${mark("techniques")}${mark("variety")}`);
}

// 엔진 이름 목록(validate.mjs의 필터·모션 타입, transitions.md의 am-* 전환)이 메뉴 어딘가에 나오는지
const validate = read("templates/validate.mjs");
const listOf = (re) => (validate.match(re)?.[1] ?? "").match(/"([A-Za-z]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
const filters = listOf(/const FILTERS = new Set\(\[([^\]]+)\]/).map((n) => `${n}Filter`);
const motions = listOf(/const MOTION_TYPES = new Set\(\[([^\]]+)\]/);
const amKeys = [...new Set(read("references/transitions.md").match(/am-[a-z-]+[a-z]/g) ?? [])];
const all = Object.values(menus).join("\n");
const unlinked = [...filters, ...motions, ...amKeys].filter((n) => !all.includes(n) && !all.includes(n.replace(/Filter$/, "")));
// 보조 필터·저수준 모션(광고 기법 이름이 아님)과 오래된 느낌이라 기본 메뉴에 넣지 않는 것(oldFilm)
const SKIP = new Set(["advancedBloomFilter", "oldFilmFilter", "adjustmentFilter", "convolutionFilter", "colorOverlayFilter", "hslAdjustmentFilter", "kawaseBlurFilter", "backdropBlurFilter", "fold", "unfold", "stagger", "keyframes", "gsapTimeline", "shake", "paint"]);
const notable = unlinked.filter((n) => !SKIP.has(n));
if (notable.length) console.log(`\n△ 메뉴에 이름이 안 나오는 엔진 기능 ${notable.length}개: ${notable.join(", ")}\n  (보조 기능이면 SKIP에, 광고 기법이면 방향·샷 카드·techniques.md·variety-core.mjs에 연결)`);
if (missing) console.log(`\n✗ 기획안에 나올 길이 없는 기법 ${missing}개`);
else console.log("\n✓ 모든 기법이 기획 메뉴에 연결됨");
process.exit(missing || (strict && notable.length) ? 1 : 0);
