// 이미지·영상·글자 Z축(깊이) + X·Y·Z 회전 예제
// node build.mjs [영상 경로 접두사, 기본 "/"]  → project.json
// - 고정 자세: 클립 transform3d { rotateX, rotateY, z, perspective } (Studio 속성 패널 "회전 · 3D"와 같은 값)
// - Z 회전: transform.angle (패널의 Z 회전)
// - 움직임: keyframes 의 x·y·z·rotateX·rotateY·angle (고정 자세 위에 더해짐)
// - move3d / move3dOut: 애니메이션 패널 "3D 이동"이 만드는 것과 같은 모양
import fs from "node:fs";

const PREFIX = process.argv[2] ?? "/";
const us = (s) => Math.round(s * 1e6);
const W = 1080, H = 1920, DUR = 8, FPS = 30;

const base = { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, angle: 0, opacity: 1 };
/** 초 단위 정지점 [at(t, 값, 이징)] → keyframes (클립 시작 from 기준 %, 정지점마다 같은 키) */
const at = (t, v = {}, easing) => ({ t, ...base, ...v, ...(easing ? { easing } : {}) });
function keys(from, to, list) {
  const d = to - from, params = {};
  for (const { t, ...v } of list) params[`${+(((t - from) / d) * 100).toFixed(2)}%`] = v;
  return { type: "keyframes", options: { duration: us(d), easing: "linear" }, params };
}
// 애니메이션 패널 "3D 이동" (motion-pack-clip.ts의 move3d / move3dOut과 같은 값)
const AWAY = { x: -120, y: 80, z: -1200, rotateX: 0, rotateY: 25, angle: 0, opacity: 0 };
const REST = { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, angle: 0, opacity: 1 };
const move3d = (delay = 0, away = AWAY) => ({ type: "keyframes",
  options: { duration: 1_000_000, delay: us(delay), easing: "easeOutCubic", motionPreset: "move3d" },
  params: { "0%": { ...REST, ...away }, "100%": REST } });
const move3dOut = (delay, away = AWAY) => ({ type: "keyframes",
  options: { duration: 1_000_000, delay: us(delay), easing: "easeInCubic", motionPreset: "move3dOut" },
  params: { "0%": REST, "100%": { ...REST, ...away } } });

const svg = (w, h, body) => "data:image/svg+xml;base64," + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`).toString("base64");

// 자리표시 "제품 사진" (실제 광고에서는 업로드한 사진 src)
const photo = svg(800, 800, `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDF3E7"/><stop offset="1" stop-color="#F3C9A8"/></linearGradient>
<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6B4A"/><stop offset="1" stop-color="#C2362B"/></linearGradient></defs>
<rect width="800" height="800" rx="48" fill="url(#b)"/><ellipse cx="400" cy="640" rx="210" ry="38" fill="#000" opacity="0.18"/>
<rect x="290" y="150" width="220" height="490" rx="60" fill="url(#c)"/><rect x="335" y="90" width="130" height="90" rx="20" fill="#2A2A3A"/>
<rect x="320" y="300" width="160" height="170" rx="18" fill="#FFF4E6"/><text x="400" y="400" font-family="sans-serif" font-size="54" font-weight="800" text-anchor="middle" fill="#C2362B">3D</text>
<rect x="306" y="170" width="26" height="440" rx="13" fill="#fff" opacity="0.28"/>`);
const tile = (c0, c1, label) => svg(600, 600, `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>
<rect width="600" height="600" rx="40" fill="url(#g)"/><circle cx="430" cy="170" r="90" fill="#fff" opacity="0.25"/>
<text x="60" y="540" font-family="sans-serif" font-size="96" font-weight="900" fill="#fff">${label}</text>`);
const badge = svg(300, 300, `<circle cx="150" cy="150" r="140" fill="#FFD84D"/><circle cx="150" cy="150" r="118" fill="none" stroke="#14163A" stroke-width="6" stroke-dasharray="14 10"/>
<text x="150" y="172" font-family="sans-serif" font-size="70" font-weight="900" text-anchor="middle" fill="#14163A">NEW</text>`);

const clips = {}, tracks = [];
let zIndex = 1;
const timing = (from, to, trim) => ({ display: { from: us(from), to: us(to) }, duration: us(to - from), playbackRate: 1, ...(trim ? { trim: { from: 0, to: us(to - from) } } : {}) });
/** 클립 하나 = 트랙 하나 (위에 있는 트랙이 앞) */
function add(id, name, clip) {
  clips[id] = { name, ...clip, transform: { angle: 0, opacity: 1, ...clip.transform, zIndex: zIndex++ } };
  tracks.push({ id: `t_${id}`, name, type: clip.type, clipIds: [id] });
}
const box = (cx, cy, w, h) => ({ x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), width: w, height: h });

// ── 바닥 영상 (평면)
add("bg", "배경 영상", { type: "Video", src: `${PREFIX}bg.mp4`, volume: 0, timing: timing(0, DUR, true), transform: box(W / 2, H / 2, W, H), animations: [] });

// ── 장면 1 (0–4.6초): 기울어진 제품 사진 + 휴대폰 화면 영상
// 사진: 고정 자세 rotateY −18·rotateX 8 (패널 값) + "3D 이동" 등장, 이후 z로 천천히 다가옴(돌리 인), 4초에 퇴장
add("photo", "제품 사진", { type: "Image", src: photo, source: { width: 800, height: 800 }, timing: timing(0, 4.6),
  transform: box(540, 900, 640, 640),
  transform3d: { rotateY: -18, rotateX: 8, perspective: 1200 },
  animations: [
    move3d(0),
    keys(0, 4.6, [at(0), at(1.1, {}, "easeInOutSine"), at(3.4, { z: 260, rotateY: 10 }), at(4.6, { z: 260, rotateY: 10 })]),
    move3dOut(3.6, { x: 160, y: -60, z: -1400, rotateY: -35 }),
  ] });
// 휴대폰 화면 영상: 고정 자세 rotateY 24·z −250, Y축으로 카드처럼 뒤집히며 등장 → Z 회전(angle)으로 살짝 기울임
add("screen", "휴대폰 화면 영상", { type: "Video", src: `${PREFIX}screen.mp4`, volume: 0, timing: timing(0.4, 4.6, true),
  transform: box(800, 1480, 380, 676), transform3d: { rotateY: 24, z: -250, perspective: 1000 },
  animations: [keys(0.4, 4.6, [
    at(0.4, { rotateY: -90, opacity: 0 }), at(0.5, { rotateY: -90 }, "easeOutBack"), at(1.4, {}, "easeInOutSine"),
    at(2.4, { angle: -8, z: 120 }, "easeInOutSine"), at(3.4, { angle: 0 }, "easeInCubic"), at(4.4, { rotateY: 90, z: -900, opacity: 0 }), at(4.6, { rotateY: 90, opacity: 0 }),
  ])] });
// 배지: Z 회전(angle) 한 바퀴 + 깊이 박동
add("badge", "NEW 배지", { type: "Image", src: badge, source: { width: 300, height: 300 }, timing: timing(0.9, 4.6),
  transform: { ...box(230, 600, 220, 220), angle: -12 },
  animations: [keys(0.9, 4.6, [
    at(0.9, { z: -1500, opacity: 0, angle: -180 }, "easeOutBack"), at(1.7, {}, "linear"), at(3.7, { angle: 360, z: 0 }, "easeInBack"), at(4.6, { angle: 360, z: -1500, opacity: 0 }),
  ])] });

// ── 장면 2 (4.4–8초): 깊이 갤러리 — 같은 크기 카드 3장이 z −1800/−900/0에 서 있다가 앞으로 지나감
const gallery = [
  { id: "g1", label: "X", c: ["#5B7CFA", "#2C3FBF"], cx: 360, cy: 820, z0: 0, rx: 0, ry: 20 },
  { id: "g2", label: "Y", c: ["#20C1A5", "#0A7C6C"], cx: 720, cy: 980, z0: -900, rx: 0, ry: -20 },
  { id: "g3", label: "Z", c: ["#FF7A59", "#C2362B"], cx: 420, cy: 1160, z0: -1800, rx: 12, ry: 15 },
];
for (const [i, g] of [...gallery.entries()].reverse()) { // 먼 카드부터 넣어야 가까운 카드가 위(레이어 순서 = 트랙 순서)
  add(g.id, `갤러리 ${g.label}`, { type: "Image", src: tile(g.c[0], g.c[1], g.label), source: { width: 600, height: 600 }, timing: timing(4.4, DUR),
    transform: box(g.cx, g.cy, 440, 440), transform3d: { rotateX: g.rx, rotateY: g.ry, z: g.z0, perspective: 1000 },
    animations: [keys(4.4, DUR, [
      at(4.4, { z: -1600, opacity: 0, rotateY: 60 }, "easeOutCubic"), at(5.3 + i * 0.15, {}, "easeInOutSine"),
      // 카메라가 앞으로 가는 느낌: 모두 같은 양만큼 다가옴. 맨 앞 카드는 상한(원근의 90%) 근처까지 오며 사라짐
      ...(i === 0
        ? [at(6.6, { z: 850, opacity: 0 }), at(DUR, { z: 850, opacity: 0 })]
        : [at(7.0, { z: 1300 }, "easeInCubic"), at(DUR, { z: i === 1 ? 1500 : 1650, opacity: i === 1 ? 0 : 1 })]),
    ])] });
}

// ── 글자 (Text도 같은 transform3d · keyframes)
const font = { fontFamily: "sans-serif", fontWeight: 900, color: "#FFFFFF", align: "center", verticalAlign: "middle" };
add("title", "제목", { type: "Text", text: "깊이를 더하다", timing: timing(0, 4.6),
  transform: box(W / 2, 260, 960, 170), style: { ...font, fontSize: 120 }, transform3d: { perspective: 900 },
  animations: [keys(0, 4.6, [
    at(0, { rotateX: -85, opacity: 0, z: -400 }), at(0.3, { rotateX: -85, opacity: 0, z: -400 }, "easeOutBack"), at(1.2, {}, "easeInOutSine"),
    at(2.6, { rotateY: 12 }, "easeInOutSine"), at(3.6, {}, "easeInCubic"), at(4.4, { rotateX: 85, opacity: 0 }), at(4.6, { rotateX: 85, opacity: 0 }),
  ])] });
add("sub", "부제", { type: "Text", text: "X · Y · Z 회전  +  Z 이동", timing: timing(0.6, 4.6),
  transform: box(W / 2, 380, 900, 80), style: { ...font, fontWeight: 700, fontSize: 48, color: "#FFE7A8", letterSpacing: 2 },
  animations: [move3d(0, { ...AWAY, x: 0, y: 40, rotateY: 0, rotateX: 60 }), move3dOut(3.0, { ...AWAY, x: 0, rotateY: 0, rotateX: -60, y: -40 })] });
add("cta", "마지막 문구", { type: "Text", text: "이미지 · 영상 · 글자 모두 3D", timing: timing(5.0, DUR),
  transform: box(W / 2, 1620, 960, 110), style: { ...font, fontSize: 64 }, transform3d: { rotateX: 18, perspective: 1000 },
  animations: [keys(5.0, DUR, [
    at(5.0, { z: -1800, rotateY: -50, opacity: 0 }, "easeOutBack"), at(6.0, {}, "easeInOutSine"), at(7.0, { angle: -4, z: 120 }, "easeInOutSine"), at(DUR, { angle: 0, z: 0 }),
  ])] });

const project = { settings: { width: W, height: H, fps: FPS, duration: us(DUR), backgroundColor: "#0B0C1F" }, tracks: tracks.reverse(), transitions: [], clips };
fs.writeFileSync("project.json", JSON.stringify(project, null, 1));
console.log(`project.json: 클립 ${Object.keys(clips).length}개 (이미지 ${Object.values(clips).filter((c) => c.type === "Image").length}, 영상 2, 글자 3)`);
