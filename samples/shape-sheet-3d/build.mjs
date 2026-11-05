// 도형 시트 + X·Y·Z 회전 예제
// 1) node shape-pngs.mjs shapes.json shapes --sheet  → shapes/_sheet-1.png + shapes/shapes.json(칸 좌표)
// 2) node build.mjs                                   → project.json
// 도형 7개가 모두 같은 시트 이미지 한 장을 쓰고(src 하나), 클립마다 crop으로 칸만 다르게 보여 준다.
// 움직임은 transform3d(고정 자세) + keyframes의 rotateX·rotateY·z·angle(애니메이션)로만 만든다.
import fs from "node:fs";

const us = (s) => Math.round(s * 1e6);
const W = 1080, H = 1080, DUR = 6, FPS = 30;
const cells = JSON.parse(fs.readFileSync("shapes/shapes.json", "utf8"));
const sheetFile = `shapes/${cells[0].sheet}`;
const sheet = "data:image/png;base64," + fs.readFileSync(sheetFile).toString("base64");
const sheetSize = (() => { const b = fs.readFileSync(sheetFile); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; })();
const cell = Object.fromEntries(cells.map((c) => [c.name, c]));

/** 초 단위 키 [{ t, ...값, easing? }] → 클립 전체 길이 keyframes (% 정지점) */
function keys(list) {
  const params = {};
  for (const { t, ...v } of list) params[`${+((t / DUR) * 100).toFixed(2)}%`] = v;
  return { type: "keyframes", options: { duration: us(DUR), easing: "linear" }, params };
}
const base = { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, angle: 0, opacity: 1, scale: 1 };
/** 시각 t에 값을 찍되 빠진 속성은 기본값으로 (정지점마다 같은 키를 갖게) */
const at = (t, v = {}, easing) => ({ t, ...base, ...v, ...(easing ? { easing } : {}) });
// 끝: 모두 뒤로(z -) 날아가며 사라짐
const exit = (t0) => [at(t0, {}, "easeInCubic"), at(DUR, { z: -1600, opacity: 0, rotateY: -40 })];

// 도형 크기(캔버스 px, scale 전)와 놓을 자리(가운데 좌표)
const place = {
  badge:   { cx: 540, cy: 430, perspective: 900 },
  star:    { cx: 220, cy: 250 },
  heart:   { cx: 860, cy: 240 },
  ring:    { cx: 200, cy: 720 },
  diamond: { cx: 880, cy: 700 },
  arrow:   { cx: 540, cy: 150 },
  pill:    { cx: 540, cy: 880 },
};

const motion = {
  // Y축으로 카드처럼 뒤집히며 깊은 곳(z -1400)에서 날아와 자리잡고, 이후 좌우로 흔들림
  badge: keys([
    at(0, { z: -1400, rotateY: 85, opacity: 0 }, "easeOutBack"),
    at(1.1, {}, "easeInOutSine"), at(2.1, { rotateY: 45 }, "easeInOutSine"), at(3.1, { rotateY: -45 }, "easeInOutSine"), at(4.1, { rotateY: 25 }, "easeInOutSine"),
    ...exit(5.0),
  ]),
  // X축으로 앞으로 넘어지며 등장, 그 뒤 Z축(angle)으로 한 바퀴
  star: keys([
    at(0, { opacity: 0 }), at(0.35, { rotateX: -88, opacity: 0 }, "easeOutBack"), at(1.2, {}, "easeInOutCubic"),
    at(3.2, { angle: 360 }, "linear"), at(5.0, { angle: 360 }, "easeInCubic"), at(DUR, { angle: 360, z: -1600, opacity: 0, rotateY: -40 }),
  ]),
  // Z(깊이)로 심장 박동: 앞으로 튀어나왔다 돌아옴
  heart: keys([
    at(0, { opacity: 0 }), at(0.5, { z: -900, opacity: 0 }, "easeOutCubic"), at(1.3, {}),
    at(1.9, { z: 220 }, "easeInQuad"), at(2.2, {}, "easeOutQuad"), at(2.45, { z: 140 }, "easeInQuad"), at(2.8, {}),
    at(3.6, { z: 220 }, "easeInQuad"), at(3.9, {}, "easeOutQuad"), at(4.15, { z: 140 }, "easeInQuad"), at(4.5, {}),
    ...exit(5.0),
  ]),
  // X·Y를 같이 기울여 궤도처럼 도는 링
  ring: keys([
    at(0, { opacity: 0 }), at(0.6, { rotateX: 70, rotateY: -70, opacity: 0 }, "easeOutCubic"), at(1.5, {}, "easeInOutSine"),
    at(2.5, { rotateX: 55, rotateY: 20 }, "easeInOutSine"), at(3.5, { rotateX: -20, rotateY: 55 }, "easeInOutSine"), at(4.5, {}),
    ...exit(5.0),
  ]),
  // Y축으로 빙글 (−80 → 80 왕복, 옆면이 얇아지는 회전)
  diamond: keys([
    at(0, { opacity: 0 }), at(0.75, { rotateY: -80, z: -600, opacity: 0 }, "easeOutCubic"), at(1.6, {}, "easeInOutSine"),
    at(2.4, { rotateY: 80 }, "easeInOutSine"), at(3.2, { rotateY: -80 }, "easeInOutSine"), at(4.0, {}),
    ...exit(5.0),
  ]),
  // 위에서 X축으로 접혀 내려오며 펼쳐짐, 이후 z로 살짝 들락
  arrow: keys([
    at(0, { opacity: 0 }), at(0.9, { rotateX: 85, y: -80, opacity: 0 }, "easeOutBack"), at(1.7, {}, "easeInOutSine"),
    at(2.5, { z: 120 }, "easeInOutSine"), at(3.3, {}, "easeInOutSine"), at(4.1, { z: 120 }, "easeInOutSine"), at(4.9, {}),
    ...exit(5.0),
  ]),
  // 바닥에 누워 있다가(rotateX 80) 일어서는 알약 + 글자
  pill: keys([
    at(0, { opacity: 0 }), at(1.2, { rotateX: 80, opacity: 0 }, "easeOutCubic"), at(2.0, {}), ...exit(5.0),
  ]),
};

const clips = {};
const tracks = [];
const tm = { display: { from: 0, to: us(DUR) }, duration: us(DUR), playbackRate: 1 };

// 배경: 그라데이션 SVG 한 장
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="g" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#2B2F6B"/><stop offset="1" stop-color="#0B0C1F"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
clips.bg = { type: "Image", name: "footage-bg", src: "data:image/svg+xml;base64," + Buffer.from(bgSvg).toString("base64"), timing: tm,
  transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1, zIndex: 0 }, animations: [] };
tracks.push({ id: "t_bg", name: "배경", type: "Image", clipIds: ["bg"] });

let z = 10;
for (const name of Object.keys(place)) {
  const c = cell[name], p = place[name];
  const w = c.width / 2, h = c.height / 2; // shapes.json scale 2
  clips[name] = {
    type: "Image", name: `shape-${name}`, src: sheet, source: sheetSize,
    crop: c.crop, // 같은 시트, 칸만 다름
    timing: tm,
    transform: { x: p.cx - w / 2, y: p.cy - h / 2, width: w, height: h, angle: 0, opacity: 1, zIndex: z++ },
    transform3d: { perspective: p.perspective ?? 1000 },
    animations: [motion[name]],
  };
  tracks.push({ id: `t_${name}`, name, type: "Image", clipIds: [name] });
}

// 알약 위 글자 — 알약과 같은 움직임
clips.label = { type: "Text", name: "label", text: "X · Y · Z", timing: tm,
  transform: { x: 540 - 280, y: 880 - 65, width: 560, height: 130, angle: 0, opacity: 1, zIndex: z++ },
  style: { fontFamily: "sans-serif", fontSize: 72, fontWeight: 800, color: "#14163A", align: "center", verticalAlign: "middle", letterSpacing: 6 },
  transform3d: { perspective: 1000 },
  animations: [motion.pill] };
tracks.push({ id: "t_label", name: "label", type: "Text", clipIds: ["label"] });

const project = { settings: { width: W, height: H, fps: FPS, duration: us(DUR), backgroundColor: "#0B0C1F" }, tracks: tracks.reverse(), transitions: [], clips };
fs.writeFileSync("project.json", JSON.stringify(project));
console.log(`project.json: 도형 ${Object.keys(place).length}개가 시트 1장(${sheetSize.width}x${sheetSize.height})을 crop으로 나눠 씀`);
