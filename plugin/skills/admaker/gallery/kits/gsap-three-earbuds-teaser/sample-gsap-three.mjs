// GSAP + three.js 샘플: 무선 이어폰 런칭 티저 (1080x1920, 6초, 가상 브랜드 "AURA")
// - 바닥: 사용자 영상(샘플은 자리표시 영상), 원본 그대로
// - 3D: three 커스텀 씬 "orbit-hero" (scenes/orbit-hero.js), 씬 안 카메라 안무는 멈춘 GSAP 타임라인
// - 글자·칩·CTA: gsapTimeline 모션 (references/gsap.md 패턴: 올라오며 펀치, 비트 펀치, 겹치는 position)
import fs from "node:fs";
import { lookStack } from "./motion.mjs";
import { fontStyle } from "./fonts.mjs";

const W = 1080, H = 1920, DUR = 6, FPS = 30;
const us = (s) => Math.round(s * 1e6);
const fr = (n) => n / FPS;
const LOCAL = process.argv.includes("--local-fonts");
const FOOTAGE_SRC = LOCAL ? "/footage.mp4" : "assets/input.mp4";
const brand = {
  colors: { background: "#0B0D14", text: "#F5F7FA", muted: "#C9CFDA", accent: "#FF5A36" },
  fonts: { display: { name: "Pretendard", weight: 800 }, body: { name: "Noto Sans KR", weight: 500 } },
};
const C = brand.colors;
const font = (tok, local) => ({ ...fontStyle(tok), ...(LOCAL ? { fontUrl: local } : {}) });
const DISPLAY = font(brand.fonts.display, "/fonts/pret800.woff2");
const BODY = font(brand.fonts.body, "/fonts/noto500.ttf");
const SHADOW = { color: "#000000", alpha: 0.5, blur: 12, offsetX: 0, offsetY: 3 };

const BEATS = [2.4, 2.9, 3.4]; // 음악 비트 (실제 광고에서는 audio.analyzeBeats 결과)
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const tf = (x, y, w, h, z, opacity = 1) => ({ x, y, width: w, height: h, angle: 0, opacity, zIndex: z });
const span = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
const gt = (tweens) => ({ type: "gsapTimeline", options: { delay: 0 }, params: { tweens } });

const clips = {}, trackOf = {};
const add = (id, clip, track) => { clips[id] = { name: id, animations: [], ...clip }; trackOf[id] = track; };

// ① 바닥 소재
add("footage_0", { type: "Video", src: FOOTAGE_SRC, timing: { ...span(0, DUR), trim: { from: 0, to: us(DUR) } }, volume: 0, transform: tf(0, 0, W, H, 2) }, "footage");

// ③ 3D 히어로: 화면 위쪽. 들어올 때 아래에서 떠오르고(0.2초부터), 4.0초에 엔드카드 자리로 올라가며 작아짐
add("hero_3d", { type: "Adapter", adapter: "three", src: "three", params: { scene: "orbit-hero", accent: C.accent, seed: 7, beats: BEATS },
  timing: span(0, DUR), transform: tf(0, 230, 1080, 1080, 30),
  animations: [gt([
    { from: { y: 160, opacity: 0, scale: 0.86, blur: 10 }, to: { y: 0, opacity: 1, scale: 1, blur: 0 }, duration: 0.9, ease: "power3.out", position: 0.2 },
    { to: { y: -150, scale: 0.78 }, duration: 0.7, ease: "power3.inOut", position: 4.0 },
  ])] }, "hero");

// ② 글자 받침: 아래 34%, 최대 0.55 (소재를 덮지 않게)
const scrim = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Math.round(H * 0.34)}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">`
  + `<stop offset="0" stop-color="${C.background}" stop-opacity="0"/><stop offset="0.55" stop-color="${C.background}" stop-opacity="0.4"/><stop offset="1" stop-color="${C.background}" stop-opacity="0.55"/></linearGradient></defs>`
  + `<rect width="100%" height="100%" fill="url(#g)"/></svg>`;
add("copy_scrim", { type: "Image", src: svgUrl(scrim), timing: span(0, DUR), transform: tf(0, Math.round(H * 0.66), W, Math.round(H * 0.34), 20),
  animations: [gt([{ from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.6, ease: "power2.out", position: 0.8 }])] }, "scrim");

// 훅 (위쪽 작은 줄)
add("hook", { type: "Text", text: "귀가 먼저 알아챕니다", timing: span(0, 4.1), transform: tf(80, 150, 920, 80, 40),
  style: { ...BODY, fontSize: 56, color: C.muted, align: "center", verticalAlign: "center", shadow: SHADOW },
  animations: [gt([
    { from: { y: 24, opacity: 0 }, to: { y: 0, opacity: 1 }, duration: 0.5, ease: "power3.out", position: 0.3 },
    { to: { y: -20, opacity: 0 }, duration: 0.25, ease: "power2.in", position: 3.85 },
  ])] }, "copy");

// 헤드라인 두 줄: 같은 패턴, 둘째 줄은 4프레임 늦게(R7 시차). 올라오며 펀치
const headLine = (id, text, y, start) => add(id, { type: "Text", text, timing: span(0, 4.1), transform: tf(80, y, 920, 130, 45),
  style: { ...DISPLAY, fontSize: 104, color: C.text, align: "left", verticalAlign: "center", shadow: SHADOW },
  animations: [gt([
    { from: { y: 70, opacity: 0, blur: 8 }, to: { y: 0, opacity: 1, blur: 0 }, duration: 0.45, ease: "power3.out", position: start },
    { to: { scale: 1.05 }, duration: 0.16, ease: "power2.out", position: "-=0.06" },
    { to: { scale: 1 }, duration: 0.3, ease: "power2.inOut" },
    { to: { y: -40, opacity: 0 }, duration: 0.25, ease: "power2.in", position: 3.8 },
  ])] }, "copy");
headLine("head_1", "소음은 지우고", 1330, 1.0);
headLine("head_2", "소리는 선명하게", 1460, 1.0 + fr(4));

// 스펙 칩 3개: 비트마다 하나씩 팝(back.out), 이후 비트에 맞춰 이미 나온 칩이 작게 펀치
const chipBg = (w) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="88"><rect x="1.5" y="1.5" width="${w - 3}" height="85" rx="43" fill="${C.background}" fill-opacity="0.55" stroke="${C.text}" stroke-opacity="0.5" stroke-width="2"/></svg>`);
const chips = [["노이즈 캔슬링", 350], ["36시간 재생", 310], ["무선 충전", 260]];
let cx = 80;
chips.forEach(([label, w], i) => {
  const enter = BEATS[i];
  const later = BEATS.slice(i + 1).flatMap((b) => [
    { to: { scale: 1.06 }, duration: 0.07, ease: "power2.out", position: b },
    { to: { scale: 1 }, duration: 0.22, ease: "power2.inOut" },
  ]);
  const anim = gt([
    { from: { scale: 0.4, opacity: 0, y: 20 }, to: { scale: 1, opacity: 1, y: 0 }, duration: 0.35, ease: "back.out(2)", position: enter },
    ...later,
    { to: { y: 30, opacity: 0 }, duration: 0.22, ease: "power2.in", position: 3.85 + i * fr(2) },
  ]);
  add(`chip_bg_${i}`, { type: "Image", src: chipBg(w), timing: span(0, 4.1), transform: tf(cx, 1630, w, 88, 50), animations: [anim] }, "chips");
  add(`chip_tx_${i}`, { type: "Text", text: label, timing: span(0, 4.1), transform: tf(cx, 1630, w, 88, 51),
    style: { ...BODY, fontSize: 40, color: C.text, align: "center", verticalAlign: "center" }, animations: [structuredClone(anim)] }, "chips");
  cx += w + 16;
});

// 엔드카드 (4.2–6초, 1초 이상 정지)
add("end_brand", { type: "Text", text: "AURA Buds", timing: span(4.1, DUR), transform: tf(80, 1250, 920, 150, 60),
  style: { ...DISPLAY, fontSize: 130, color: C.text, align: "center", verticalAlign: "center", shadow: SHADOW },
  animations: [gt([{ from: { y: 50, opacity: 0, scale: 0.94 }, to: { y: 0, opacity: 1, scale: 1 }, duration: 0.55, ease: "power3.out", position: 0.1 }])] }, "end");
add("end_cta", { type: "Text", text: "11월 15일 사전예약", timing: span(4.1, DUR), transform: tf(80, 1420, 920, 80, 61),
  style: { ...BODY, fontSize: 50, color: C.text, align: "center", verticalAlign: "center", shadow: SHADOW },
  animations: [gt([{ from: { y: 30, opacity: 0 }, to: { y: 0, opacity: 1 }, duration: 0.5, ease: "power3.out", position: 0.1 + fr(5) }])] }, "end");
add("end_bar", { type: "Shape", src: "shape", shapeType: "rect", timing: span(4.5, DUR), transform: tf(430, 1530, 220, 10, 61), style: { fill: C.accent },
  animations: [{ type: "wipe", options: { duration: us(0.45), delay: 0, easing: "expo.out" }, params: { direction: "right" } }] }, "end");

// 룩 스택(비네트만, 소재 있음) + 조립
const look = lookStack({ W, H, duration: DUR, brand, dark: true });
const project = { settings: { width: W, height: H, fps: FPS, duration: us(DUR), backgroundColor: C.background }, tracks: [], clips: {}, transitions: [] };
const tracks = new Map();
const put = (id, clip, t) => {
  project.clips[id] = clip;
  if (!tracks.has(t)) tracks.set(t, { id: `t_${t}`, name: t, type: clip.type, clipIds: [] });
  tracks.get(t).clipIds.push(id);
};
for (const [id, c] of Object.entries(look.clips)) put(id, c, look.trackOf[id]);
for (const [id, c] of Object.entries(clips)) put(id, c, trackOf[id]);
project.tracks = [...tracks.values()];
const out = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "project.json";
fs.writeFileSync(out, JSON.stringify(project, null, 2));
console.log(`${out}: ${Object.keys(project.clips).length} clips`);
