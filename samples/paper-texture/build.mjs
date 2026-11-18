// 종이 질감 샘플 (9:16, 5.5초) — 1) 종이 바탕 + 찢은 종이 콜라주  2) 크라프트 엔드카드
// node build.mjs → project.json  (렌더: templates/render/render.mjs, 폰트는 render/fonts/에 Pretendard woff2)
import fs from "node:fs";
import { image, text, keys, us } from "../../plugin/skills/admaker/templates/effects.mjs";
import { paperSvg, paperCutSvg, svgUrl } from "../../plugin/skills/admaker/templates/paper.mjs";

const W = 1080, H = 1920;
const BLACK = { fontFamily: "Pretendard", fontUrl: "/fonts/Pretendard-Black.woff2", fontWeight: "400" };
const BOLD = { fontFamily: "PretendardBold", fontUrl: "/fonts/Pretendard-Bold.woff2", fontWeight: "400" };
const full = { x: 0, y: 0, width: W, height: H };
const layers = []; const add = (...c) => layers.push(...c);
const boil = (a, b, amount = 2, seed = 1) => ({ type: "lineBoil", options: { duration: us(b - a), easing: "linear" }, params: { amount, scale: 16, fps: 8, variants: 3, seed } });
// 탁 붙는 등장: 살짝 크게·기울어진 채 → 제자리
const slap = (a, b, t, ang) => keys(a, b, [[t, { scale: 1.18, opacity: 0, angle: ang - 5 }], [t + 0.09, { opacity: 1 }], [t + 0.22, { scale: 1, angle: ang }, "easeOutBack"]]);
const piece = (name, a, b, t, box, color, ang, seed, rough = 9) => image(name, svgUrl(paperCutSvg({ w: box.width, h: box.height, color, seed, rough })), a, b, box,
  { animations: [slap(a, b, t, ang), boil(a, b, 1.6, seed)] });
const label = (name, str, a, b, t, box, ang, style) => text(name, str, a, b, box, style, { animations: [slap(a, b, t, ang)] });
// 화면 전체 종이 결을 곱하기로 얹는 오버레이(글자·조각이 같은 종이에 인쇄된 듯)
const overlay = (name, a, b, opts = {}) => image(name, svgUrl(paperSvg({ W, H, overlay: true, crumple: 0.35, grain: 0.7, fiber: 0.3, speck: 0.3, ...opts })), a, b, full, { style: { blendMode: "multiply" } });

// ── 1) 0–3초: 미색 종이 + 찢은 색종이 콜라주
const A = 0, B = 3;
add(image("bg1", svgUrl(paperSvg({ W, H, tone: "cream", crumple: 0.5, fold: 2, seed: 21 })), A, B, full));
add(piece("p_red", A, B, 0.15, { x: 70, y: 430, width: 960, height: 380 }, "#E8452C", -4, 5));
add(label("t_red", "종이 위에", A, B, 0.15, { x: 70, y: 430, width: 960, height: 380 }, -4, { ...BLACK, fontSize: 160, color: "#FFF6E8" }));
add(piece("p_blue", A, B, 0.55, { x: 120, y: 820, width: 860, height: 340 }, "#2C4BD8", 3, 9));
add(label("t_blue", "직접 붙인", A, B, 0.55, { x: 120, y: 820, width: 860, height: 340 }, 3, { ...BLACK, fontSize: 150, color: "#FFF6E8" }));
add(piece("p_yel", A, B, 0.95, { x: 230, y: 1190, width: 620, height: 250 }, "#F5C431", -2, 13));
add(label("t_yel", "광고", A, B, 0.95, { x: 230, y: 1190, width: 620, height: 250 }, -2, { ...BLACK, fontSize: 140, color: "#1E1A16" }));
add(text("cap1", "PAPER TEXTURE · SAMPLE", A, B, { x: 0, y: 1560, width: W, height: 80 }, { ...BOLD, fontSize: 40, color: "#5A4A36", letterSpacing: 6 },
  { animations: [keys(A, B, [[1.3, { opacity: 0, y: 20 }], [1.6, { opacity: 1, y: 0 }, "easeOutCubic"]])] }));
add(overlay("ov1", A, B, { seed: 31 }));

// ── 2) 3–5.5초: 크라프트 엔드카드 + 테이프
const E = B, F = 5.5;
add(image("bg3", svgUrl(paperSvg({ W, H, tone: "kraft", crumple: 0.6, grain: 0.8, fiber: 0.9, speck: 0.5, seed: 51 })), E, F, full));
add(piece("p_card", E, F, E + 0.1, { x: 140, y: 640, width: 800, height: 560 }, "#FBF8F1", 2, 23, 6));
add(label("t_brand", "HANJAN", E, F, E + 0.1, { x: 140, y: 700, width: 800, height: 250 }, 2, { ...BLACK, fontSize: 170, color: "#1F1812", letterSpacing: 4 }));
add(label("t_sub", "콜드브루 · 한 잔에 담은 12시간", E, F, E + 0.1, { x: 140, y: 930, width: 800, height: 120 }, 2, { ...BOLD, fontSize: 48, color: "#6B5440" }));
add(piece("tape1", E, F, E + 0.45, { x: 100, y: 590, width: 240, height: 90 }, "#EDE3C4", -28, 29, 4));
add(piece("tape2", E, F, E + 0.55, { x: 740, y: 1130, width: 240, height: 90 }, "#EDE3C4", -26, 31, 4));
add(piece("p_cta", E, F, E + 0.8, { x: 270, y: 1330, width: 540, height: 170 }, "#E8452C", -2, 37, 7));
add(label("t_cta", "가까운 매장 찾기", E, F, E + 0.8, { x: 270, y: 1330, width: 540, height: 170 }, -2, { ...BLACK, fontSize: 64, color: "#FFF6E8" }));
add(overlay("ov3", E, F, { seed: 61, crumple: 0.3 }));

layers.forEach((c, i) => { c.id = c.id ?? `${c.name}_${i}`; c.transform.zIndex = i + 1; });
const project = {
  settings: { width: W, height: H, fps: 30, duration: us(F), backgroundColor: "#000000" },
  tracks: [...layers].reverse().map((c) => ({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] })),
  clips: Object.fromEntries(layers.map((c) => [c.id, c])),
  transitions: [],
};
fs.writeFileSync("project.json", JSON.stringify(project));
console.log(layers.length, "clips", (fs.statSync("project.json").size / 1e6).toFixed(2), "MB");
