// "admaker — Motion Engine Reel '26": 키네틱 타이포 + 도형 쇼릴 (15초, 120 BPM, 1920×1080).
// 장: 00 SPEC(카드) → 01 LETTER(가변 폰트) → 02 SHAPE(바우하우스 격자) → 03 DEPTH(three.js 블록 + 공) → 04 TEMPO(입자·다이얼) → 카드.
// node build.mjs → project.json
import fs from "node:fs";

const W = 1920, H = 1080, FPS = 30, BPM = 120, BEAT = 60 / BPM;
const us = (s) => Math.round(Math.round(s * FPS) * 1e6 / FPS);
const C = { orange: "#FF4A1C", cream: "#F1ECE3", ink: "#141414", blue: "#2B3FD6", yellow: "#F5B400", dark: "#121212", paper: "#F6F2EA" };
const F = {
  serif: { fontFamily: "InstSerif", fontUrl: "/assets/fonts/InstrumentSerif.ttf" },
  serifI: { fontFamily: "InstSerifI", fontUrl: "/assets/fonts/InstrumentSerif-Italic.ttf" },
  grot: { fontFamily: "ArchivoVF", fontUrl: "/assets/fonts/Archivo-VF.ttf" },
  mono: { fontFamily: "JBMono", fontUrl: "/assets/fonts/JetBrainsMono-VF.ttf" },
};
const SCENE = { spec: [0, 2.5], letter: [2.5, 5], shape: [5, 7.5], depth: [7.5, 10], tempo: [10, 12.75], outro: [12.75, 15] };

const clips = {}, tracks = [];
let n = 0;
function add(track, c) {
  const id = `${track}_${++n}`;
  const from = c.from, to = c.to;
  clips[id] = {
    type: c.type, ...(c.text !== undefined ? { text: c.text } : {}), ...(c.src ? { src: c.src } : {}),
    ...(c.shapeType ? { shapeType: c.shapeType } : {}), ...(c.adapter ? { adapter: c.adapter, params: c.params } : {}),
    timing: { display: { from: us(from), to: us(to) }, duration: us(to) - us(from), playbackRate: 1 },
    transform: { x: c.x, y: c.y, width: c.w, height: c.h, angle: c.angle ?? 0, opacity: c.opacity ?? 1, zIndex: 1_000_000 + (c.z ?? 10) },
    ...(c.style ? { style: c.style } : {}),
    animations: c.anims ?? [],
  };
  let t = tracks.find((t) => t.name === track);
  if (!t) tracks.push((t = { id: `t_${track}`, name: track, type: c.type, clipIds: [] }));
  t.clipIds.push(id);
  return id;
}
// keyframes 하나. stops: { "0%": {...}, ... }, at/dur 초(클립 시작 기준)
const kf = (stops, dur, at = 0, extra = {}) => ({ type: "keyframes", options: { duration: us(dur), delay: us(at), easing: "linear", ...extra }, params: stops });
const paint = (stops, dur, at = 0) => ({ type: "paint", options: { duration: us(dur), delay: us(at), easing: "linear" }, params: stops });
// 늦은 입장: 0%~시작 구간을 숨긴 값으로 붙잡음 (엔진은 delay 전 keyframes를 적용하지 않음)
function enter(from, to, at, dur, total, ease = "easeOutExpo") {
  const a = Math.min(99.9, (at / total) * 100), b = Math.min(100, ((at + dur) / total) * 100);
  const stops = { "0%": { ...from } };
  if (a > 0) stops[`${a}%`] = { ...from, easing: ease }; else stops["0%"].easing = ease;
  stops[`${b}%`] = { ...to };
  if (b < 100) stops["100%"] = { ...to };
  return kf(stops, total);
}
const rect = (track, o) => add(track, { type: "Shape", src: "shape", shapeType: o.shape ?? "rectangle", ...o, style: { fill: o.fill, ...(o.style ?? {}) } });
const text = (track, o) => add(track, { type: "Text", ...o });
const mono = (size, color, extra = {}) => ({ ...F.mono, fontSize: size, fontWeight: 500, color, letterSpacing: size * 0.06, ...extra });

// ───────── HUD (장마다 색이 바뀌는 프레임 장식) ─────────
const CHAPTERS = [
  { key: "spec", label: "00 — SPEC SHEET", ease: "EASE expo.out", ink: C.cream },
  { key: "letter", label: "01 — LETTER", ease: "EASE expo.inOut  ·  WDTH 62→125", ink: C.ink },
  { key: "shape", label: "02 — SHAPE", ease: "EASE back.inOut(1.7)", ink: C.ink },
  { key: "depth", label: "03 — DEPTH", ease: "EASE parabola  g = 9.8", ink: C.ink },
  { key: "tempo", label: "04 — TEMPO", ease: "EASE 1 − e^(−kt)", ink: C.cream },
  { key: "outro", label: "05 — AVAILABLE", ease: "EASE back.out(2)", ink: C.cream },
];
for (const ch of CHAPTERS) {
  const [a, b] = SCENE[ch.key];
  const ink = ch.ink, M = 44, L = 34, T = 2;
  // 모서리 괄호
  for (const [x, y, sx, sy] of [[M, M, 1, 1], [W - M, M, -1, 1], [M, H - M, 1, -1], [W - M, H - M, -1, -1]]) {
    rect("hud", { from: a, to: b, x: sx > 0 ? x : x - L, y: sy > 0 ? y : y - T, w: L, h: T, fill: ink, z: 90, opacity: 0.85 });
    rect("hud", { from: a, to: b, x: sx > 0 ? x : x - T, y: sy > 0 ? y : y - L, w: T, h: L, fill: ink, z: 90, opacity: 0.85 });
  }
  text("hud", { from: a, to: b, text: "ADMAKER / MOTION ENGINE REEL '26", x: 96, y: 52, w: 700, h: 24, z: 91, style: mono(15, ink), opacity: 0.9 });
  text("hud", { from: a, to: b, text: ch.label, x: 96, y: H - 76, w: 600, h: 24, z: 91, style: mono(15, ink), opacity: 0.9 });
  text("hud", { from: a, to: b, text: ch.ease, x: W - 96 - 700, y: H - 76, w: 700, h: 24, z: 91, style: mono(15, ink, { align: "right" }), opacity: 0.9 });
  // 아래 눈금자: 세로 막대 문자를 넓은 자간으로
  text("hud", { from: a, to: b, text: "|".repeat(64), x: 460, y: H - 64, w: 1000, h: 16, z: 91, style: mono(10, ink, { letterSpacing: 6.2, align: "center" }), opacity: 0.35 });
}
// 타임코드: 영상 시간 그대로 (countUp timecode, 엔진 3.0.25+)
const tcInk = (k) => CHAPTERS.find((c) => c.key === k).ink;
for (const k of Object.keys(SCENE)) {
  const [a, b] = SCENE[k];
  text("tc", { from: a, to: b, text: "TC 00:00:00:00", x: W - 96 - 400, y: 52, w: 400, h: 24, z: 91, style: mono(15, tcInk(k), { align: "right" }), opacity: 0.9,
    anims: [{ type: "countUp", options: { duration: us(b - a), delay: 0, easing: "linear" }, params: { format: "timecode", fps: FPS, from: a, to: b } }] });
}

// ───────── 00 SPEC 카드 (0–2.5) / 05 카드 다시 (12.75–15) ─────────
const CARD = { x: 230, y: 150, w: 1460, h: 780 };
function card(a, b, mode) {
  const total = b - a;
  const lx = CARD.x + 70, top = CARD.y + 56, rx = CARD.x + 860;
  // 카드 전체가 같은 입장·퇴장을 받음 → 한 덩어리로 움직임
  const cardIn = mode === "intro"
    ? enter({ y: 520, rotateX: 58, perspective: 1400, opacity: 0, blur: 10, scale: 0.92 }, { y: 0, rotateX: 0, perspective: 1400, opacity: 1, blur: 0, scale: 1 }, 0.05, 0.55, total)
    : enter({ scale: 1.18, blur: 18, opacity: 0 }, { scale: 1, blur: 0, opacity: 1 }, 0, 0.4, total, "easeOutQuart");
  const cardOut = mode === "intro"
    ? kf({ "0%": { x: 0, motionBlur: 0, easing: "easeInExpo" }, "100%": { x: -2300, motionBlur: 80 } }, 0.25, total - 0.25)
    : null;
  const group = (late) => [cardIn, ...(cardOut ? [cardOut] : []), ...(late ?? [])];
  const late = (at, dur = 0.4, from = { opacity: 0, y: 18, blur: 4 }) => enter(from, { opacity: 1, y: 0, blur: 0 }, at, dur, total);
  rect("card", { from: a, to: b, ...CARD, fill: C.paper, z: 20, anims: group() });
  // 윗줄
  const row = mono(15, C.ink);
  text("card", { from: a, to: b, text: "SPEC SHEET", x: lx, y: top, w: 400, h: 22, z: 21, style: row, anims: group([late(0.45)]) });
  text("card", { from: a, to: b, text: "NO. 001 — ENGINE", x: CARD.x + 560, y: top, w: 340, h: 22, z: 21, style: { ...row, align: "center" }, anims: group([late(0.5)]) });
  text("card", { from: a, to: b, text: "2026", x: CARD.x + CARD.w - 70 - 200, y: top, w: 200, h: 22, z: 21, style: { ...row, align: "right" }, anims: group([late(0.55)]) });
  rect("card", { from: a, to: b, x: lx, y: top + 40, w: CARD.w - 140, h: 2, fill: C.ink, z: 21,
    anims: group([{ type: "wipe", options: { duration: us(0.5), delay: us(0.45), easing: "easeInOutQuart" }, params: { direction: "right" } }]) });
  // 워드마크
  const word = { ...F.serif, fontSize: 210, color: C.ink, letterSpacing: -4 };
  if (mode === "intro") {
    // 글자가 왼쪽부터 번지듯 씀 (stagger)
    text("card", { from: a, to: b, text: "admaker", x: lx - 6, y: top + 76, w: 760, h: 220, z: 22, style: word,
      anims: group([{ type: "stagger", options: { duration: us(0.7), delay: us(0.5), easing: "easeOutCubic" }, params: { type: "character", stagger: 0.05, from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 } } }]) });
  } else {
    // 글자마다 흩어진 자리에서 모여듦 (stagger scatter, 엔진 3.0.25+)
    text("card", { from: a, to: b, text: "admaker", x: lx - 6, y: top + 76, w: 760, h: 220, z: 22, style: word,
      anims: group([{ type: "stagger", options: { duration: us(0.75), delay: us(0.1), easing: "easeOutBack" }, params: { type: "character", stagger: 0.04, from: { opacity: 0 }, to: { opacity: 1 }, scatter: { x: 260, y: 180, angle: 70, scale: 0.6, seed: 5 } } }]) });
  }
  // 빨간 점: 박에 팡
  const dotAt = mode === "intro" ? 1.25 : 0.95;
  rect("card", { from: a, to: b, shape: "circle", x: lx + 724, y: top + 232, w: 34, h: 34, fill: C.orange, z: 23,
    anims: group([enter({ scale: 0, opacity: 1 }, { scale: 1, opacity: 1 }, dotAt, 0.35, total, "easeOutBack"),
      ...(mode === "intro" ? [kf({ "0%": { y: 0, easing: "easeOutQuad" }, "50%": { y: -40, easing: "easeInQuad" }, "100%": { y: 0 } }, 0.5, dotAt + 0.4)] : [])]) });
  text("card", { from: a, to: b, text: "Motion Engine", x: lx, y: top + 318, w: 700, h: 60, z: 21, style: { ...F.grot, fontSize: 50, fontWeight: 800, color: C.ink, fontVariation: { wdth: 100 } }, anims: group([late(0.7)]) });
  if (mode === "outro") {
    rect("card", { from: a, to: b, x: lx, y: top + 384, w: 372, h: 6, fill: C.orange, z: 21,
      anims: group([{ type: "wipe", options: { duration: us(0.4), delay: us(1.0), easing: "easeInOutQuart" }, params: { direction: "right" } }]) });
  }
  text("card", { from: a, to: b, text: "Type that breathes, shapes that snap,\ntime you can hear.", x: lx, y: top + 410, w: 700, h: 110, z: 21,
    style: { ...F.serifI, fontSize: 38, color: "#3a3631", lineHeight: 1.15 }, anims: group([late(0.8)]) });
  // 오른쪽 목록
  text("card", { from: a, to: b, text: "CAPABILITIES", x: rx, y: top + 80, w: 400, h: 22, z: 21, style: mono(14, "#57524b"), anims: group([late(0.6)]) });
  const rows = [["01", "Letter", "variable axes · extrude"], ["02", "Shape", "pie & grid systems"], ["03", "Depth", "three.js · light"], ["04", "Tempo", "beats & particles"]];
  rows.forEach(([no, name, desc], i) => {
    const y = top + 120 + i * 78, at = mode === "intro" ? 0.65 + i * 0.1 : 0.2 + i * 0.06;
    text("card", { from: a, to: b, text: no, x: rx, y: y + 18, w: 60, h: 22, z: 21, style: mono(14, "#57524b"), anims: group([late(at)]) });
    text("card", { from: a, to: b, text: name, x: rx + 64, y, w: 260, h: 56, z: 21, style: { ...F.grot, fontSize: 40, fontWeight: 800, color: C.ink }, anims: group([late(at + 0.04, 0.4, { opacity: 0, x: -30, blur: 6 })]) });
    text("card", { from: a, to: b, text: desc, x: rx + 300, y: y + 20, w: 300, h: 22, z: 21, style: mono(14, "#57524b"), anims: group([late(at + 0.08)]) });
    rect("card", { from: a, to: b, x: rx, y: y + 66, w: 560, h: 2, fill: C.ink, z: 21,
      anims: group([{ type: "wipe", options: { duration: us(0.35), delay: us(at), easing: "easeInOutQuart" }, params: { direction: "right" } }]) });
    if (mode === "outro") {
      // 장마다 작은 아이콘이 박에 튀어나옴
      const ix = rx + 516, iy = y + 14, ia = 1.3 + i * 0.12;
      const pop = enter({ scale: 0, angle: -40 }, { scale: 1, angle: 0 }, ia, 0.35, total, "easeOutBack");
      if (i === 0) {
        rect("card", { from: a, to: b, x: ix, y: iy, w: 36, h: 36, fill: C.ink, z: 22, anims: group([pop]) });
        text("card", { from: a, to: b, text: "Aa", x: ix, y: iy + 4, w: 36, h: 28, z: 23, style: { ...F.serif, fontSize: 24, color: C.paper, align: "center" }, anims: group([pop]) });
      } else if (i === 1) {
        [[0, 0, C.orange, 90, 180], [18, 0, C.blue, 180, 270], [0, 18, C.yellow, 0, 90], [18, 18, C.ink, 270, 360]].forEach(([dx, dy, c, s, e]) =>
          rect("card", { from: a, to: b, shape: "pie", x: ix + dx - (dx ? 18 : 0), y: iy + dy - (dy ? 18 : 0), w: 36, h: 36, fill: c, z: 22, style: { startAngle: s, endAngle: e }, anims: group([pop]) }));
      } else if (i === 2) {
        rect("card", { from: a, to: b, shape: "hexagon", x: ix, y: iy, w: 36, h: 36, fill: C.blue, z: 22, anims: group([pop]) });
      } else {
        rect("card", { from: a, to: b, shape: "pie", x: ix, y: iy, w: 36, h: 36, fill: C.ink, z: 22, style: { startAngle: 0, endAngle: 360, innerRadius: 0.8 }, anims: group([pop]) });
        rect("card", { from: a, to: b, x: ix + 17, y: iy + 7, w: 2.5, h: 12, fill: C.orange, z: 23, anims: group([pop]) });
      }
    }
  });
  // 아랫줄
  text("card", { from: a, to: b, text: "REEL  15 SEC · 120 BPM · 1920×1080", x: lx, y: CARD.y + CARD.h - 70, w: 600, h: 22, z: 21, style: mono(14, C.ink), anims: group([late(0.9)]) });
  text("card", { from: a, to: b, text: "STACK  Engine · Animation · Three · Canvas", x: rx, y: CARD.y + CARD.h - 150, w: 560, h: 22, z: 21, style: mono(14, C.ink), anims: group([late(0.95)]) });
  if (mode === "outro") {
    text("card", { from: a, to: b, text: "AVAILABLE NOW", x: CARD.x + 560, y: CARD.y + CARD.h - 70, w: 340, h: 22, z: 21, style: { ...mono(15, C.ink), fontWeight: 800, align: "center" }, anims: group([late(1.6)]) });
    // 깜빡이는 사각형: 1초 주기
    rect("card", { from: a, to: b, x: CARD.x + 885, y: CARD.y + CARD.h - 68, w: 14, h: 16, fill: C.orange, z: 22,
      anims: group([late(1.6), kf({ "0%": { opacity: 1 }, "49%": { opacity: 1 }, "50%": { opacity: 0 }, "100%": { opacity: 0 } }, 0.5, 1.7, { iterCount: 2 })]) });
  }
  text("card", { from: a, to: b, text: "P. 1 / 1", x: CARD.x + CARD.w - 70 - 200, y: CARD.y + CARD.h - 70, w: 200, h: 22, z: 21, style: { ...mono(14, C.ink), align: "right" }, anims: group([late(1.0)]) });
}
rect("bg", { from: SCENE.spec[0], to: SCENE.spec[1], x: 0, y: 0, w: W, h: H, fill: C.dark, z: 1 });
card(...SCENE.spec, "intro");
rect("bg", { from: SCENE.outro[0], to: SCENE.outro[1], x: 0, y: 0, w: W, h: H, fill: C.dark, z: 1 });
card(...SCENE.outro, "outro");

// ───────── 01 LETTER (2.5–5.0) — 가변 폰트 폭·굵기가 박마다 숨쉼 ─────────
{
  const [a, b] = SCENE.letter, total = b - a;
  rect("bg", { from: a, to: b, x: 0, y: 0, w: W, h: H, fill: C.orange, z: 1 });
  const big = { ...F.grot, fontSize: 330, color: C.ink, align: "center", verticalAlign: "middle", fontVariation: { wdth: 125, wght: 900 }, letterSpacing: -6 };
  // 축 애니메이션: 0 슬램 → 박마다 좁게/넓게 (wdth 62↔125, wght 900↔560)
  const breath = paint({
    "0%": { wdth: 125, wght: 900, letterSpacing: -6 },
    "16%": { wdth: 125, wght: 900, letterSpacing: -6, easing: "easeInOutExpo" },
    "32%": { wdth: 62, wght: 900, letterSpacing: 30, easing: "easeInOutExpo" },
    "48%": { wdth: 112, wght: 620, letterSpacing: -2, easing: "easeInOutExpo" },
    "60%": { wdth: 62, wght: 900, letterSpacing: 10 },
    "100%": { wdth: 62, wght: 900, letterSpacing: 10 },
  }, total);
  const outAt = 1.5;
  text("letter", { from: a, to: a + outAt + 0.2, text: "LETTER", x: 0, y: 340, w: W, h: 400, z: 20, style: big,
    anims: [kf({ "0%": { x: 1700, motionBlur: 90, easing: "easeOutExpo" }, "100%": { x: 0, motionBlur: 0 } }, 0.32), breath,
      kf({ "0%": { opacity: 1, blur: 0, scale: 1, easing: "easeInCubic" }, "100%": { opacity: 0, blur: 24, scale: 0.9 } }, 0.2, outAt)] });
  // 윤곽선 메아리: 위아래로 쌓인 외곽선 글자가 박에 맞춰 밀려 남
  for (const [i, dy] of [[1, -250], [2, -500], [3, 250], [4, 500]].map(([i, d]) => [i, d])) {
    text("letter", { from: a, to: a + outAt + 0.2, text: "LETTER", x: 0, y: 340 + dy, w: W, h: 400, z: 15, opacity: 0.9,
      style: { ...big, color: "rgba(0,0,0,0)", stroke: { color: C.ink, width: 1.5 } },
      anims: [breath, enter({ opacity: 0, y: -dy * 0.4 }, { opacity: 1, y: 0 }, 0.75 + (i % 2) * 0.06, 0.4, outAt + 0.2, "easeOutExpo"),
        kf({ "0%": { y: 0, easing: "easeInOutQuart" }, "100%": { y: dy * 0.12 } }, 0.5, 1.0),
        kf({ "0%": { opacity: 1 }, "100%": { opacity: 0 } }, 0.15, outAt)] });
  }
  // 폰트 정보: 축 값이 같이 움직임 (countUp)
  const info = mono(15, C.ink);
  text("letter", { from: a, to: a + outAt + 0.2, text: "FAMILY  Archivo VF", x: 96, y: 860, w: 500, h: 22, z: 21, style: info });
  // 한 클립에 countUp을 둘 넣으면 뒤의 것이 delay 전에도 시작 값을 써 버리므로 구간마다 클립을 나눔
  text("letter", { from: a, to: a + 0.8, text: "WDTH  125.0", x: 96, y: 888, w: 500, h: 22, z: 21, style: info,
    anims: [{ type: "countUp", options: { duration: us(0.4), delay: us(0.4), easing: "easeInOutExpo" }, params: { from: 125, to: 62, decimals: 1 } }] });
  text("letter", { from: a + 0.8, to: a + outAt + 0.2, text: "WDTH  62.0", x: 96, y: 888, w: 500, h: 22, z: 21, style: info,
    anims: [{ type: "countUp", options: { duration: us(0.4), delay: 0, easing: "easeInOutExpo" }, params: { from: 62, to: 112, decimals: 1 } }] });
  text("letter", { from: a, to: a + outAt + 0.2, text: "WGHT  900", x: 96, y: 916, w: 500, h: 22, z: 21, style: info });
  // 이탤릭 세리프로 바뀜 + 입체 돌출 (엔진 3.0.25+ extrude)
  const ia = outAt;
  text("letter", { from: a + ia, to: b, text: "letter", x: 0, y: 300, w: W, h: 460, z: 22,
    style: { ...F.serifI, fontSize: 400, color: C.cream, align: "center", verticalAlign: "middle", letterSpacing: -6, extrude: { depth: 34, angle: 52, color: C.ink } },
    anims: [kf({ "0%": { scale: 1.35, blur: 26, opacity: 0, easing: "easeOutExpo" }, "100%": { scale: 1, blur: 0, opacity: 1 } }, 0.35),
      kf({ "0%": { angle: 0, easing: "easeInOutSine" }, "100%": { angle: -4 } }, total - ia)] });
  // 회전 배지: 원 위 글자 (textPath) + 가운데 숫자
  const bx = 1330, by = 250, bs = 300, ba = ia + 0.35;
  const pop = enter({ scale: 0 }, { scale: 1 }, 0, 0.35, total - ba, "easeOutBack");
  rect("letter", { from: a + ba, to: b, shape: "circle", x: bx, y: by, w: bs, h: bs, fill: C.ink, z: 24, anims: [pop] });
  text("letter", { from: a + ba, to: b, text: "ON THE BEAT • VARIABLE AXES • KINETIC LETTER • ", x: bx, y: by, w: bs, h: bs, z: 25,
    style: { ...mono(19, C.cream), fontWeight: 700, letterSpacing: 2, textPath: { type: "circle", radius: 118, spread: true } },
    anims: [pop, kf({ "0%": { angle: 0 }, "100%": { angle: 140 } }, total - ba)] });
  text("letter", { from: a + ba, to: b, text: "01", x: bx, y: by + 90, w: bs, h: 120, z: 25, style: { ...F.serifI, fontSize: 96, color: C.cream, align: "center", verticalAlign: "middle" }, anims: [pop] });
  // 다음 장으로: 배지에서 크림색 원이 커지며 화면을 덮음
  rect("letter", { from: b - 0.3, to: b, shape: "circle", x: bx + bs / 2 - 50, y: by + bs / 2 - 50, w: 100, h: 100, fill: C.cream, z: 60,
    anims: [kf({ "0%": { scale: 0, easing: "easeInExpo" }, "100%": { scale: 48 } }, 0.3)] });
}

// ───────── 02 SHAPE (5.0–7.5) — 글자가 바우하우스 격자로 부서지고, 박마다 조각이 뒤집힘 ─────────
const COLS = 8, ROWS = 4, CELL = 180, GX = (W - COLS * CELL) / 2, GY = (H - ROWS * CELL) / 2;
const KINDS = ["square", "circle", "half", "quarter", "triangle"];
const PAL = [C.orange, C.blue, C.yellow, C.ink];
const rng = ((s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32))(20261114);
const CELLS = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const kind = KINDS[Math.floor(rng() * KINDS.length)];
  CELLS.push({ col: c, row: r, kind, rot: [0, 90, 180, 270][Math.floor(rng() * 4)], color: PAL[Math.floor(rng() * PAL.length)], small: kind === "circle" && rng() < 0.25 });
}
// 공이 튈 가운데 블록은 높은 사각
Object.assign(CELLS[1 * COLS + 4], { kind: "square", color: C.orange, rot: 0, small: false, h: 1.8 });
{
  const [a, b] = SCENE.shape, total = b - a;
  rect("bg", { from: a, to: b, x: 0, y: 0, w: W, h: H, fill: C.cream, z: 1 });
  // 1) "SHAPE" — A 자리는 파란 삼각형, 칸마다 한 글자
  const word = ["S", "H", "▲", "P", "E"], cw = 330, wx = (W - cw * word.length) / 2, breakAt = 0.6;
  word.forEach((ch, i) => {
    const x = wx + i * cw, ent = enter({ y: 160, opacity: 0, blur: 8 }, { y: 0, opacity: 1, blur: 0 }, i * 0.05, 0.3, breakAt + 0.25, "easeOutExpo");
    const brk = kf({ "0%": { scale: 1, angle: 0, opacity: 1, easing: "easeInBack" }, "100%": { scale: 0.2, angle: (i % 2 ? 1 : -1) * 120, opacity: 0, y: (i - 2) * 40 } }, 0.25, breakAt);
    if (ch === "▲") rect("shapeword", { from: a, to: a + breakAt + 0.25, shape: "triangle", x: x + 35, y: 400, w: 260, h: 250, fill: C.blue, z: 20, anims: [ent, brk] });
    else text("shapeword", { from: a, to: a + breakAt + 0.25, text: ch, x, y: 340, w: cw, h: 400, z: 20, style: { ...F.grot, fontSize: 340, color: C.ink, align: "center", verticalAlign: "middle", fontVariation: { wdth: 110, wght: 900 } }, anims: [ent, brk] });
  });
  // 2) 격자선 + 모서리 십자
  const gStart = breakAt;
  for (let c = 0; c <= COLS; c++) rect("grid", { from: a + gStart, to: b, x: GX + c * CELL - 0.75, y: GY - 40, w: 1.5, h: ROWS * CELL + 80, fill: C.ink, z: 5, opacity: 0.25,
    anims: [{ type: "wipe", options: { duration: us(0.35), delay: 0, easing: "easeInOutQuart" }, params: { direction: "down" } }] });
  for (let r = 0; r <= ROWS; r++) rect("grid", { from: a + gStart, to: b, x: GX - 40, y: GY + r * CELL - 0.75, w: COLS * CELL + 80, h: 1.5, fill: C.ink, z: 5, opacity: 0.25,
    anims: [{ type: "wipe", options: { duration: us(0.35), delay: 0, easing: "easeInOutQuart" }, params: { direction: "right" } }] });
  for (const [x, y] of [[GX, GY], [GX + COLS * CELL, GY], [GX, GY + ROWS * CELL], [GX + COLS * CELL, GY + ROWS * CELL]]) {
    rect("grid", { from: a + gStart, to: b, x: x - 14, y: y - 1.5, w: 28, h: 3, fill: C.ink, z: 6 });
    rect("grid", { from: a + gStart, to: b, x: x - 1.5, y: y - 14, w: 3, h: 28, fill: C.ink, z: 6 });
  }
  // 3) 조각: 대각선 순서로 튀어나오고, 박(6.0, 6.5, 7.0)마다 일부가 90° 뒤집히거나 색이 바뀜
  const flipBeats = [1.0, 1.5, 2.0];
  CELLS.forEach((cell, i) => {
    const x0 = GX + cell.col * CELL, y0 = GY + cell.row * CELL, pad = 8, s = CELL - pad * 2;
    const at = gStart + 0.05 + (cell.col + cell.row) * (2 / FPS);
    const local = total - (at - 0);
    const pop = enter({ scale: 0, angle: -90, opacity: 0 }, { scale: 1, angle: 0, opacity: 1 }, at, 0.4, total, "back.out(1.7)");
    const anims = [pop];
    const flips = flipBeats.filter((_, k) => (cell.col * 3 + cell.row * 5 + k * 7) % 4 === 0);
    const rotatable = cell.kind !== "quarter";
    let geom;
    if (cell.kind === "quarter") {
      // 사분원: 칸 모서리가 중심인 2배 상자의 pie (회전은 모서리·각도로 표현)
      const corner = { 0: [0, 0, 90, 180], 90: [1, 0, 180, 270], 180: [1, 1, 270, 360], 270: [0, 1, 0, 90] }[cell.rot];
      geom = { shape: "pie", x: x0 + pad + corner[0] * s - s, y: y0 + pad + corner[1] * s - s, w: s * 2, h: s * 2, style: { startAngle: corner[2], endAngle: corner[3] } };
    } else if (cell.kind === "half") geom = { shape: "pie", x: x0 + pad, y: y0 + pad, w: s, h: s, style: { startAngle: cell.rot, endAngle: cell.rot + 180 } };
    else if (cell.kind === "circle") { const k = cell.small ? 0.4 : 1; geom = { shape: "circle", x: x0 + pad + (s * (1 - k)) / 2, y: y0 + pad + (s * (1 - k)) / 2, w: s * k, h: s * k }; }
    else if (cell.kind === "triangle") geom = { shape: "triangle", x: x0 + pad, y: y0 + pad, w: s, h: s, angle: cell.rot };
    else geom = { shape: "rectangle", x: x0 + pad, y: y0 + pad, w: s, h: s };
    let ang = 0;
    for (const fb of flips) {
      if (rotatable) {
        anims.push(kf({ "0%": { angle: 0, blur: 0, easing: "back.inOut(1.7)" }, "50%": { blur: 3 }, "100%": { angle: 90, blur: 0 } }, 0.32, fb));
        ang += 90;
      } else {
        const next = PAL[(PAL.indexOf(cell.color) + 1 + flips.indexOf(fb)) % PAL.length];
        anims.push(paint({ "0%": { fillColor: cell.color, easing: "easeInOutQuart" }, "100%": { fillColor: next } }, 0.2, fb));
      }
    }
    anims.push(kf({ "0%": { scale: 1, easing: "easeInOutQuart" }, "100%": { scale: 1.03 } }, 0.6, total - 0.6));
    rect("pieces", { from: a, to: b, ...geom, fill: cell.color, z: 10, anims });
    // 3D 매치 컷용: 회전이 쌓인 최종 상태를 3D에 넘김
    cell.rot3d = cell.kind === "quarter" ? cell.rot : (cell.rot + (cell.kind === "triangle" || cell.kind === "half" ? ang : 0)) % 360;
    cell.color3d = rotatable ? cell.color : PAL[(PAL.indexOf(cell.color) + flips.length * (flips.length + 1) / 2) % PAL.length];
  });
}

// ───────── 03 DEPTH (7.5–10.0) — 같은 격자가 three.js 블록으로 솟음 ─────────
{
  const [a, b] = SCENE.depth;
  rect("bg", { from: a, to: b, x: 0, y: 0, w: W, h: H, fill: C.cream, z: 1 });
  // 바닥 위 큰 글자 (원근으로 눕힘)
  text("depth", { from: a + 0.6, to: b, text: "DEPTH", x: 0, y: 120, w: W, h: 420, z: 3, opacity: 0.18,
    style: { ...F.grot, fontSize: 380, color: C.ink, align: "center", verticalAlign: "middle", fontVariation: { wdth: 125, wght: 900 } },
    anims: [kf({ "0%": { rotateX: 48, perspective: 1600, opacity: 0, y: 80, easing: "easeOutExpo" }, "100%": { rotateX: 48, perspective: 1600, opacity: 1, y: 0 } }, 0.5),
      kf({ "0%": { x: 0 }, "100%": { x: -120 } }, b - a - 0.6)] });
  add("three", { type: "Adapter", adapter: "three", src: "three", from: a, to: b, x: 0, y: 0, w: W, h: H, z: 10,
    params: { scene: "depth-blocks", cols: COLS, rows: ROWS, frameCols: W / CELL,
      cells: CELLS.map((c) => ({ col: c.col, row: c.row, kind: c.kind === "circle" && c.small ? "circle" : c.kind, rot: c.rot3d, color: c.color3d, h: c.h ?? (c.small ? 0.5 : 1) })),
      tilt: [0.1, 1.1], rise: [0.25, 1.3], elevation: 33, orbit: 16,
      ball: { col: 4, row: 1, t0: 1.0, beat: BEAT, height: 1.3, color: C.orange }, push: [2.2, 2.5] },
    anims: [kf({ "0%": { blur: 0, easing: "easeInExpo" }, "100%": { blur: 14 } }, 0.2, b - a - 0.2)] });
  // 공이 화면을 덮으며 다음 장으로
  rect("depth", { from: b - 0.18, to: b, shape: "circle", x: W / 2 - 60, y: H / 2 - 60, w: 120, h: 120, fill: C.orange, z: 60,
    anims: [kf({ "0%": { scale: 0.5, easing: "easeInQuad" }, "100%": { scale: 22 } }, 0.18)] });
}

// ───────── 04 TEMPO (10.0–12.75) — 동심원 → 입자 소용돌이 → TEMPO → 도는 호, 시계 눈금 ─────────
{
  const [a, b] = SCENE.tempo, total = b - a;
  rect("bg", { from: a, to: b, x: 0, y: 0, w: W, h: H, fill: C.dark, z: 1 });
  // 동심원이 안쪽부터 줄어들며 어둠을 드러냄
  const rings = ["#FF4A1C", "#FF5E2E", "#FF7240", "#FF8752", "#E8441A", "#C93A16"];
  rings.forEach((c, i) => {
    const d = 2400 - i * 360;
    rect("tempo", { from: a, to: a + 0.7, shape: "circle", x: W / 2 - d / 2, y: H / 2 - d / 2, w: d, h: d, fill: c, z: 5 + i,
      anims: [kf({ "0%": { scale: 1, easing: "easeInExpo" }, "100%": { scale: 0 } }, 0.42, 0.12 + (rings.length - i) * 0.035)] });
  });
  // 시계 다이얼: 눈금 60개 (원 위 글자), 진행 호 (pie 링, endAngle 애니메이션)
  const D = 900, dx = W / 2 - D / 2, dy = H / 2 - D / 2;
  text("tempo", { from: a + 0.35, to: b, text: "|".repeat(60), x: dx, y: dy, w: D, h: D, z: 8, opacity: 0.55,
    style: { ...mono(22, C.cream), fontWeight: 400, letterSpacing: 0, textPath: { type: "circle", radius: 420, spread: true } },
    anims: [enter({ opacity: 0, scale: 1.2 }, { opacity: 1, scale: 1 }, 0, 0.5, total - 0.35), kf({ "0%": { angle: 0 }, "100%": { angle: 18 } }, total - 0.35)] });
  rect("tempo", { from: a + 0.35, to: b, shape: "pie", x: dx + 30, y: dy + 30, w: D - 60, h: D - 60, fill: C.orange, z: 9, opacity: 0.85,
    style: { startAngle: 0, endAngle: 0, innerRadius: 0.985 },
    anims: [paint({ "0%": { endAngle: 0, easing: "easeInOutCubic" }, "100%": { endAngle: 360 } }, total - 0.35)] });
  // 큰 윤곽선 TEMPO (뒤)
  text("tempo", { from: a + 1.0, to: b, text: "TEMPO", x: 0, y: 340, w: W, h: 400, z: 6, opacity: 0.22,
    style: { ...F.grot, fontSize: 300, color: "rgba(0,0,0,0)", stroke: { color: C.cream, width: 1.2 }, align: "center", verticalAlign: "middle", fontVariation: { wdth: 125, wght: 900 } },
    anims: [enter({ opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1 }, 0, 0.6, total - 1.0)] });
  // 입자: 흩어짐 → 소용돌이 → TEMPO → 도는 호
  add("particles", { type: "Adapter", adapter: "script", src: "script", from: a + 0.25, to: b, x: 0, y: 0, w: W, h: H, z: 20,
    params: { name: "particle-morph", text: "TEMPO", font: F.grot.fontFamily, fontUrl: F.grot.fontUrl, weight: 900, size: 330, letterSpacing: 10, step: 7,
      count: 2600, seed: 9, dot: 2.6, streak: 2.5, spread: 0.2, swirl: 1.2, color: "#FF5A1F", color2: "#FFE2C4",
      vortex: { r0: 0.1, r1: 0.3, spin: 2.6 }, rings: { radii: [0.1, 0.17, 0.24, 0.31, 0.38], spin: 0.9, gap: 0.25 },
      keys: [{ t: 0, form: "burst" }, { t: 0.0, form: "vortex", dur: 0.5 }, { t: 0.55, form: "text", dur: 0.65 }, { t: 1.85, form: "rings", dur: 0.5 }] },
    anims: [kf({ "0%": { scale: 1, opacity: 1, easing: "easeInExpo" }, "100%": { scale: 1.6, opacity: 0 } }, 0.25, total - 0.25 - 0.25)] });
  // 다음 장: 하얀 섬광
  rect("tempo", { from: b - 0.12, to: b, x: 0, y: 0, w: W, h: H, fill: C.cream, z: 70, anims: [kf({ "0%": { opacity: 0 }, "100%": { opacity: 0.85 } }, 0.12)] });
}
// 초침: 박마다 6° 딸깍 (steps)
{
  const [a, b] = SCENE.tempo;
  // 바늘은 가운데 정사각 상자(투명)의 위쪽 끝에 그린 path로 만들어 상자째 돌린다
  add("hand", { type: "Shape", src: "shape", shapeType: "path", from: a + 0.35, to: b, x: W / 2 - 450, y: H / 2 - 450, w: 900, h: 900, z: 12,
    style: { fill: C.orange, path: "M448 18 L452 18 L452 64 L448 64 Z", viewBox: [0, 0, 900, 900] },
    anims: [kf({ "0%": { angle: 0 }, "100%": { angle: 6 * Math.round((b - a - 0.35) / BEAT) } }, b - a - 0.35, 0, { easing: `steps(${Math.round((b - a - 0.35) / BEAT)})` })] });
}

// ───────── 사운드 ─────────
{
  const id = add("audio", { type: "Audio", src: "/assets/mix.wav", from: 0, to: 15, x: 0, y: 0, w: 0, h: 0, z: 0 });
  delete clips[id].transform;
  clips[id].volume = 1;
}

// 엔진은 트랙 순서로 zIndex를 다시 매긴다(앞 트랙이 위). 1,000,000 이상인 "명시 zIndex"만 그대로 두므로 그 구간을 쓴다.
const project = { settings: { width: W, height: H, fps: FPS, backgroundColor: "#000000" }, tracks, clips, transitions: [] };
fs.writeFileSync("project.json", JSON.stringify(project));
fs.writeFileSync("cells.json", JSON.stringify(CELLS));
console.log(`clips ${Object.keys(clips).length}, tracks ${tracks.length}`);
