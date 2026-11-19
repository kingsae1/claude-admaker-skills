// 방사선·패턴·흔들림 샘플 (9:16, 8초, 120BPM) — templates/rays.mjs · patterns.mjs · noise.mjs
// 1) 0–3초  방사선이 박마다 딱딱 돌고 "50%"가 꽂힌 뒤 살아 있는 듯 흔들림
// 2) 3–5.5초 도트 패턴이 사선으로 흐르고 흰 카드가 둥둥 떠 있음(wiggle)
// 3) 5.5–8초 소용돌이 방사선(가운데 흐림)이 천천히 돌고, 아래 줄무늬 띠가 흐름 + "오늘 오픈"
// node build.mjs → project.json  (렌더: templates/render/render.mjs, 폰트는 render/fonts/에 Pretendard woff2)
// 앱으로: node <스킬>/templates/to-admaker-import.mjs project.json admaker-import.json
// 실제 광고에서는 소재 장면 사이의 모션 전용 씬(인터루드)·엔드카드·누끼 제품 뒤 배경으로 씁니다.
import fs from "node:fs";
import { image, text, shape, keys, us } from "../../plugin/skills/admaker/templates/effects.mjs";
import { svgUrl } from "../../plugin/skills/admaker/templates/paper.mjs";
import { raysSvg, raysBox, raysSpin } from "../../plugin/skills/admaker/templates/rays.mjs";
import { patternSvg, patternBox, patternDrift } from "../../plugin/skills/admaker/templates/patterns.mjs";
import { wiggleKeys } from "../../plugin/skills/admaker/templates/noise.mjs";

const W = 1080, H = 1920, BEAT = 60 / 120;
const BLACK = { fontFamily: "Pretendard", fontUrl: "/fonts/Pretendard-Black.woff2", fontWeight: "400" };
const BOLD = { fontFamily: "PretendardBold", fontUrl: "/fonts/Pretendard-Bold.woff2", fontWeight: "400" };
const layers = []; const add = (...c) => layers.push(...c);
// 이징은 그 stop → 다음 stop 구간에 걸리므로 시작 stop에. 넘치는 이징(easeOutBack)은 opacity와 분리
const slam = (a, b, t) => [keys(a, b, [[t, { scale: 2.2, angle: -8 }, "easeOutBack"], [t + 0.2, { scale: 1, angle: 0 }]]), keys(a, b, [[t, { opacity: 0 }], [t + 0.06, { opacity: 1 }]])];
const rise = (a, b, t, dy = 40) => keys(a, b, [[t, { y: dy, opacity: 0 }, "easeOutCubic"], [t + 0.3, { y: 0, opacity: 1 }]]);

// ── 1) 0–3초: 방사선 비트 회전 + 가격
{
  const A = 0, B = 3;
  const r = { width: W, height: H, rays: 16, colors: ["#FFD23F", "#FF9A1F"], center: [0.5, 0.42] };
  add(image("rays1", svgUrl(raysSvg(r)), A, B, raysBox(r), { animations: [raysSpin({ rays: 16, mode: "beat", beat: BEAT, duration: B - A })] }));
  add(shape("disc", "circle", A, B, { x: 190, y: 456, width: 700, height: 700 }, { fill: "#FFFFFF" }, { animations: slam(A, B, 0.1) }));
  add(text("p50", "50%", A, B, { x: 140, y: 560, width: 800, height: 340 }, { ...BLACK, fontSize: 300, color: "#E8261C" },
    { animations: [...slam(A, B, 0.25), wiggleKeys({ seed: 3, freq: 2, amp: { angle: 2.5, scale: 0.025 }, duration: B - A, delay: 0.5 })] }));
  add(text("off", "주말 한정 할인", A, B, { x: 140, y: 880, width: 800, height: 120 }, { ...BOLD, fontSize: 64, color: "#1E1A16" }, { animations: [rise(A, B, 0.55)] }));
}

// ── 2) 3–5.5초: 도트 패턴 흐름 + 떠 있는 카드
{
  const A = 3, B = 5.5;
  const p = { kind: "dots", size: 64, colors: ["#FFFFFF", "#2D5BFF"], weight: 16, angle: 20 };
  const box = patternBox({ width: W, height: H, ...p });
  add(image("dots", svgUrl(patternSvg({ ...p, width: box.width, height: box.height })), A, B, box,
    { animations: [patternDrift({ ...p, dir: "xy", period: BEAT * 2, duration: B - A })] }));
  const float = (seed) => wiggleKeys({ seed, freq: 0.5, amp: { x: 8, y: 16, angle: 1.5 }, duration: B - A });
  add(shape("card", "rounded", A, B, { x: 150, y: 560, width: 780, height: 640 }, { fill: "#FFFFFF", borderRadius: 48 }, { animations: [rise(A, B, A + 0.05, 80), float(11)] }));
  add(text("new", "NEW", A, B, { x: 150, y: 620, width: 780, height: 260 }, { ...BLACK, fontSize: 220, color: "#2D5BFF" }, { animations: [rise(A, B, A + 0.15, 80), float(11)] }));
  add(text("flavor", "망고 크림 라떼", A, B, { x: 150, y: 900, width: 780, height: 140 }, { ...BOLD, fontSize: 80, color: "#1A1A1A" }, { animations: [rise(A, B, A + 0.25, 80), float(11)] }));
  add(text("sub", "부드럽게 둥둥", A, B, { x: 150, y: 1040, width: 780, height: 90 }, { ...BOLD, fontSize: 48, color: "#6A6A6A" }, { animations: [rise(A, B, A + 0.35, 80), float(11)] }));
}

// ── 3) 5.5–8초: 소용돌이 방사선 + 줄무늬 띠
{
  const A = 5.5, B = 8;
  const r = { width: W, height: H, rays: 24, colors: ["#FF4F79", "#FFC2D1"], center: [0.5, 0.4], twist: 45, softness: 0.45 };
  add(image("rays3", svgUrl(raysSvg(r)), A, B, raysBox(r), { animations: [raysSpin({ rays: 24, period: 10, dir: -1, duration: B - A })] }));
  const st = { kind: "stripes", size: 60, colors: ["#1E1A16", "#FFE14D"], angle: 45 };
  const band = { x: -90, y: 1380, width: W + 180, height: 220 };
  add(image("band", svgUrl(patternSvg({ ...st, width: band.width, height: band.height })), A, B, band,
    { animations: [patternDrift({ ...st, period: BEAT, duration: B - A })] }));
  add(text("open", "오늘 오픈", A, B, { x: 90, y: 600, width: 900, height: 260 }, { ...BLACK, fontSize: 190, color: "#FFFFFF", stroke: { color: "#1E1A16", width: 10 } },
    { animations: [...slam(A, B, A + 0.1), wiggleKeys({ seed: 21, freq: 1.2, amp: { x: 6, y: 6, angle: 2 }, octaves: 2, duration: B - A, delay: 0.4 })] }));
  add(text("addr", "성수동 2가 · 오전 11시", A, B, { x: 90, y: 1430, width: 900, height: 120 }, { ...BLACK, fontSize: 64, color: "#1E1A16" }));
  add(shape("addrbg", "rectangle", A, B, { x: 170, y: 1420, width: 740, height: 140 }, { fill: "#FFE14D" }, { animations: [rise(A, B, A + 0.5)] }));
}

// addrbg는 글자 뒤로
const ai = layers.findIndex((c) => c.name === "addr"), bi = layers.findIndex((c) => c.name === "addrbg");
layers.splice(ai, 0, layers.splice(bi, 1)[0]);
layers.find((c) => c.name === "addr").animations = [rise(5.5, 8, 6.0)];

layers.forEach((c, i) => { c.transform.zIndex = i + 1; });
const project = {
  settings: { width: W, height: H, fps: 30, duration: us(8), backgroundColor: "#000000" },
  tracks: [...layers].reverse().map((c) => ({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] })),
  clips: Object.fromEntries(layers.map((c) => [c.id, c])),
  transitions: [],
};
fs.writeFileSync("project.json", JSON.stringify(project));
console.log(layers.length, "clips", (fs.statSync("project.json").size / 1e6).toFixed(2), "MB");
