// 트랙 매트(style.matte) + 잉크 번짐 전환(am-ink-bleed) + 글자 3D(tumble_in·flip_in_x·flip_in_y·flip_out_x) 샘플
// node build.mjs                      → project.json (앱 가져오기용: 글자 3D는 Text style.characterAnimation)
// node build.mjs --harness /fonts/     → project.harness.json (렌더 하니스용: 글자 3D를 scripts/text-segment.js 어댑터로, 폰트는 render/fonts/)
// 1) 0–3.6초  text-as-mask: 제품 사진이 "FRESH" 글자 안에서만 보이고, F 세로 획 속으로 60배 확대되며 화면을 채움
// 2) 3.6–6.6초 매트 없는 같은 사진으로 이어 붙이고 "ORANGE JUICE" tumble_in → flip_out_x
// 3) 5.4–6.6초 am-ink-bleed 로 종이 장면으로 번져 넘어감
// 4) 6.6–10초 "IN INK" flip_in_y (6.7초부터), 부제 flip_in_x
import fs from "node:fs";
import { fontStyle } from "../../plugin/skills/admaker/templates/fonts.mjs";

const us = (s) => Math.round(s * 1e6);
const W = 1080, H = 1920, DUR = 10, FPS = 30;
const tm = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
// 글꼴: Pretendard Black 하나 (앱 폰트 목록에 있음). Text 클립이 fontUrl로 불러오면 글자 어댑터도 같은 이름으로 씀
const FONT = fontStyle({ name: "Pretendard", weight: 900 });
const HARNESS = process.argv[2] === "--harness";
if (HARNESS && process.argv[3]) FONT.fontUrl = process.argv[3] + FONT.fontUrl.split("/").pop();
const { _weight, ...TITLE_FONT } = FONT;
const svg = (body) => "data:image/svg+xml;base64," + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`).toString("base64");

/** 초 단위 정지점 [[t, {키: 값}, 이징]] → keyframes (클립 기준 %, 정지점마다 같은 키) */
function keys(from, to, stops) {
  const d = to - from, params = {};
  for (const [t, v, easing] of stops) params[`${+(((t - from) / d) * 100).toFixed(2)}%`] = { ...v, ...(easing ? { easing } : {}) };
  return { type: "keyframes", options: { duration: us(d), delay: 0, easing: "linear" }, params };
}

// ── 자리표시 소재 (실제 광고에서는 제품 영상·사진 src)
const product = svg(`<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB347"/><stop offset="1" stop-color="#FF6A1A"/></linearGradient>
<linearGradient id="gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE3B0"/><stop offset="1" stop-color="#FFC266"/></linearGradient>
<radialGradient id="sl" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD27A"/><stop offset="0.8" stop-color="#FF9A1F"/><stop offset="1" stop-color="#E86A00"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="180" cy="320" r="240" fill="#FFD27A" opacity="0.45"/><circle cx="930" cy="1650" r="300" fill="#FF8A2A" opacity="0.5"/>
<g transform="translate(540 1010)"><ellipse cx="0" cy="470" rx="300" ry="50" fill="#7A2E00" opacity="0.25"/>
<rect x="-190" y="-430" width="380" height="900" rx="80" fill="url(#gl)"/><rect x="-110" y="-560" width="220" height="160" rx="30" fill="#2E7D32"/>
<rect x="-190" y="-120" width="380" height="330" fill="#FFF8EC"/><text x="0" y="40" font-family="sans-serif" font-weight="900" font-size="88" text-anchor="middle" fill="#FF6A1A">OJ</text>
<text x="0" y="130" font-family="sans-serif" font-weight="600" font-size="34" text-anchor="middle" fill="#7A2E00">100% squeezed</text>
<rect x="-160" y="-400" width="40" height="820" rx="20" fill="#fff" opacity="0.35"/></g>
<g transform="translate(250 1600)"><circle r="150" fill="url(#sl)"/><g stroke="#FFF1C9" stroke-width="10" opacity="0.8">${[0, 45, 90, 135].map((a) => `<line x1="0" y1="0" x2="${Math.cos((a * Math.PI) / 180) * 130}" y2="${Math.sin((a * Math.PI) / 180) * 130}"/><line x1="0" y1="0" x2="${-Math.cos((a * Math.PI) / 180) * 130}" y2="${-Math.sin((a * Math.PI) / 180) * 130}"/>`).join("")}</g></g>`);
const paper = svg(`<rect width="${W}" height="${H}" fill="#F2EADB"/>
<circle cx="760" cy="560" r="330" fill="#FF4F8B" opacity="0.85"/><circle cx="420" cy="760" r="300" fill="#2F6BFF" opacity="0.8" style="mix-blend-mode:multiply"/>
<rect x="120" y="1380" width="840" height="14" fill="#1E1A2E"/><rect x="120" y="1420" width="560" height="14" fill="#1E1A2E" opacity="0.6"/>
${Array.from({ length: 260 }, (_, i) => `<circle cx="${(i * 397) % W}" cy="${(i * 911) % H}" r="${1 + (i % 3)}" fill="#1E1A2E" opacity="0.12"/>`).join("")}`);

const clips = {}, tracks = [];
let z = 1;
/** 클립 하나 = 트랙 하나. 렌더 하니스는 tracks 앞쪽이 위라서 뒤에 넣은 클립 트랙을 앞에 끼움 (뒤에 넣을수록 위) */
function add(id, clip) {
  clips[id] = { id, name: id, animations: [], ...clip, transform: { angle: 0, opacity: 1, ...clip.transform, zIndex: z++ } };
  tracks.unshift({ id: `t_${id}`, name: id, type: clip.type, clipIds: [id] });
}
const full = { x: 0, y: 0, width: W, height: H };
/** 글자 3D 클립. 앱은 Text style.characterAnimation을 그대로 그림.
 * 렌더 하니스(Exporter)의 Text는 characterAnimation을 그리지 않아서 HARNESS일 때만 앱과 같은 글자 렌더러(scripts/text-segment.js) 어댑터로 바꿈 */
const seg = (from, to, box, text, style, characterAnimation, animations = []) => HARNESS
  ? { type: "Adapter", adapter: "script", src: "script", timing: tm(from, to), transform: box, animations,
      params: { name: "text-segment", text, duration: to - from,
        transform: { fontName: FONT.fontFamily, align: "center", verticalAlign: "center", opacity: 1, ...style, characterAnimation } } }
  : { type: "Text", text, timing: tm(from, to), transform: box, animations,
      style: { ...TITLE_FONT, align: "center", ...style, characterAnimation } };

// ── 1) text-as-mask
// P = 확대해 들어갈 글자 획 안의 점(캔버스 px). Pretendard Black 230px "FRESH"의 F 세로 획 가운데. 글꼴·크기를 바꾸면 스틸에서 다시 잼
const TITLE_BOX = { x: 0, y: 760, width: W, height: 400 }, P = { x: 208, y: 896 };
const C = { x: TITLE_BOX.x + TITLE_BOX.width / 2, y: TITLE_BOX.y + TITLE_BOX.height / 2 };
const zoomAt = (scale, extra = {}) => ({ scale, x: -(P.x - C.x) * (scale - 1), y: -(P.y - C.y) * (scale - 1), opacity: 1, ...extra });
add("cream", { type: "Shape", src: "shape", shapeType: "rectangle", timing: tm(0, 3.6), transform: full, style: { fill: "#F4F1EA" } });
add("product_in", { type: "Image", src: product, timing: tm(0, 3.6), transform: full,
  style: { matte: { clipId: "title", mode: "alpha" } } });
add("title", { type: "Text", text: "FRESH", timing: tm(0, 3.6), transform: TITLE_BOX,
  style: { ...TITLE_FONT, fontSize: 230, color: "#000000", align: "center" },
  // 글자 F 세로 획 안의 점 P를 제자리에 두고 확대: scale은 박스 가운데 기준이라 x·y 오프셋 = −(P − 가운데) × (scale − 1)
  animations: [keys(0, 3.6, [
    [0, zoomAt(1.25, { opacity: 0 }), "easeOutExpo"],
    [1.0, zoomAt(1)],
    [2.6, zoomAt(1), "easeInOutQuad"],
    [2.9, zoomAt(0.94), "easeInExpo"],
    [3.6, zoomAt(60)],
  ])] });
add("tagline", seg(0.7, 2.8, { x: 0, y: 1190, width: W, height: 80 }, "squeezed this morning", { fontSize: 44, color: "#1D1A16" },
  [{ type: "flip_in_x", duration: 0.5, stagger: 0.025, staggerMode: "char" }, { type: "fade_out", duration: 0.3 }]));

// ── 2) 매트 없는 같은 사진으로 이어 붙임 + tumble_in → flip_out_x
add("product_full", { type: "Image", src: product, timing: tm(3.6, 6.6), transform: full,
  animations: [keys(3.6, 6.6, [[0 + 3.6, { scale: 1 }], [6.6, { scale: 1.06 }]])] });
add("endline", seg(3.8, 5.3, { x: 0, y: 260, width: W, height: 160 }, "ORANGE JUICE", { fontSize: 120, color: "#FFFFFF", letterSpacing: 4 },
  [{ type: "tumble_in", duration: 0.6, stagger: 0.04, staggerMode: "char" }, { type: "flip_out_x", duration: 0.45, stagger: 0.02, staggerMode: "char" }]));

// ── 3) 잉크 번짐 전환 → 4) 종이 장면
add("paper", { type: "Image", src: paper, timing: tm(5.4, DUR), transform: full });
add("headline", seg(6.7, DUR, { x: 0, y: 1080, width: W, height: 260 }, "IN INK", { fontSize: 230, color: "#1E1A2E", letterSpacing: 6 },
  [{ type: "flip_in_y", duration: 0.7, stagger: 0.07, staggerMode: "char" }]));
add("sub", seg(7.1, DUR, { x: 0, y: 1500, width: W, height: 70 }, "letterpress edition", { fontSize: 44, color: "#1E1A2E" },
  [{ type: "flip_in_x", duration: 0.5, stagger: 0.025, staggerMode: "char" }]));

// 전환 클립은 맨 위 트랙에 둠 (렌더 하니스에서 전환 위 트랙에 Adapter가 있으면 to 화면이 검게 나옴)
add("ink", { type: "Transition", transitionKey: "am-ink-bleed", fromClipId: "product_full", toClipId: "paper", timing: tm(5.4, 6.6),
  transform: full, easing: "easeInOutSine", values: { origin: [0.35, 0.62], edgeColor: [0.12, 0.1, 0.18], seed: 5 } });

const project = { settings: { width: W, height: H, fps: FPS, duration: us(DUR), backgroundColor: "#000000" }, tracks, clips, transitions: [] };
fs.writeFileSync(new URL(HARNESS ? "./project.harness.json" : "./project.json", import.meta.url), JSON.stringify(project, null, 1));
console.log("ok", Object.keys(clips).length, "clips");
