// 흘러내림(drip) 샘플 — 1) 앱 아이콘 아랫변 드립(끊겨 떨어짐 + 매달림)  2) 글자 획 아래 녹아내림
// node build.mjs [--draw <draw.mjs 경로>] [--font <otf/ttf>] → project.json  (렌더: templates/render/render.mjs)
import fs from "node:fs";
import opentype from "opentype.js";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const { textToPath, textDripClips, boxDripClips } = await import(new URL(arg("--draw", "../../plugin/skills/admaker/templates/draw.mjs"), import.meta.url));
const font = opentype.parse(fs.readFileSync(arg("--font", "Pretendard-Black.otf")).buffer.slice(0));

const W = 1080, H = 1920, us = (s) => Math.round(s * 1e6);
const tm = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
const FONT = { fontFamily: "Pretendard", fontUrl: "/fonts/Pretendard-Black.woff2", fontWeight: "400" };
const layers = []; // 아래 → 위
const add = (...cs) => layers.push(...cs);
const T = (a, b, x, y, w, h) => ({ timing: tm(a, b), transform: { x, y, width: w, height: h, angle: 0, opacity: 1 } });
const pop = [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens: [{ from: { scale: 0.6, opacity: 0 }, to: { scale: 1, opacity: 1 }, duration: 0.45, ease: "back.out(2)", position: 0 }] } }];

// 1) 아이콘 0–3.4초
const A = 0, B = 3.4, NAVY = "#15125C";
const icon = { x: 340, y: 520, width: 400, height: 400, radius: 96 };
add({ id: "bg1", name: "bg1", type: "Shape", src: "shape", shapeType: "rectangle", style: { fill: "#EDEFF3" }, animations: [], ...T(A, B, 0, 0, W, H) });
add({ id: "icon", name: "icon", type: "Shape", src: "shape", shapeType: "rounded", style: { fill: NAVY, borderRadius: icon.radius }, animations: pop, ...T(A, B, icon.x, icon.y, icon.width, icon.height) });
add({ id: "iconGlyph", name: "iconGlyph", type: "Text", text: "Ad", style: { ...FONT, fontSize: 230, color: "#A3A0FF", letterSpacing: -6, align: "center", verticalAlign: "center" }, animations: pop, ...T(A, B, icon.x, icon.y, icon.width, icon.height) });
add(...boxDripClips({ box: icon, color: NAVY, startSec: 0.55, endSec: B, count: 2, fall: 1, width: 26, maxLength: 560, id: "iconDrip" }).clips);

// 2) 글자 3.4–7.4초
const C = B, D = B + 4;
const PINK = "#FF3D6E";
add({ id: "bg2", name: "bg2", type: "Shape", src: "shape", shapeType: "rectangle", style: { fill: "#FFF1E2" }, animations: [], ...T(C, D, 0, 0, W, H) });
const glyph = textToPath(font, "MELT", { fontSize: 300, letterSpacing: 4, align: "center" });
const melt = textDripClips({ glyph, centerX: W / 2, centerY: 720, color: PINK, startSec: C, endSec: D, count: 6, fall: 1, maxLength: 620, id: "melt" });
add(...melt.clips);
add({ id: "sub", name: "sub", type: "Text", text: "녹아내리는 여름 세일", style: { ...FONT, fontSize: 72, color: "#3A1F2B", align: "center", verticalAlign: "center" }, animations: pop, ...T(C + 0.6, D, 0, 1500, W, 120) });

const project = {
  settings: { width: W, height: H, fps: 30, duration: us(D), backgroundColor: "#000000" },
  tracks: [...layers].reverse().map((c) => ({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] })), // 앞 = 위
  clips: Object.fromEntries(layers.map((c) => [c.id, c])),
  transitions: [],
};
fs.writeFileSync("project.json", JSON.stringify(project, null, 1));
console.log(`${layers.length} clips · anchors`, melt.anchors.map((a) => `${a.canvasX}(${a.stem})`).join(" "));
