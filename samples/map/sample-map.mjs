// 지도 샘플 샷: 서울 → 부산 배송 경로 (1080x1920, 6초)
import fs from "node:fs";
import { makeProjection, baseMapSrc, regionShape, routeShape, pinShape, mapCamera } from "./map.mjs";
import { entrance, lookStack, holdFrom } from "./motion.mjs";
import { fontStyle } from "./fonts.mjs";
import { us } from "./timeline.mjs";

const W = 1080, H = 1920, DUR = 6;
const LOCAL_FONTS = process.argv.includes("--local-fonts");
const brand = {
  colors: { background: "#0B0F1A", surface: "#1A2233", text: "#F5F7FA", muted: "#8A94A6", accent: "#FF5A36", primary: "#3D5AFE" },
  fonts: { display: { name: "Black Han Sans" }, body: { name: "Noto Sans KR", weight: 500 } },
};
const C = brand.colors;
const font = (tok, local) => ({ ...fontStyle(tok), ...(LOCAL_FONTS ? { fontUrl: local } : {}) });

const geo = JSON.parse(fs.readFileSync("kor.geojson", "utf8"));
const features = geo.features;
const byName = (n) => features.find((f) => f.properties.name === n);
const map = makeProjection(features, [90, 200, 900, 1150]);

const SEOUL = [126.978, 37.566], BUSAN = [129.075, 35.18];
const all = { display: { from: 0, to: us(DUR) }, duration: us(DUR), playbackRate: 1 };
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const tf = (x, y, w, h, z, opacity = 1) => ({ x, y, width: w, height: h, angle: 0, opacity, zIndex: z });
const at = (sec, pct) => ({ "0%": pct[0], "100%": pct[1] });

const clips = {};
const trackOf = {};
const add = (id, clip, track) => { clips[id] = { name: id, ...clip }; trackOf[id] = track; };

// 바탕 지도
add("map_base", { type: "Image", src: baseMapSrc(map, features, { W, H, fill: C.surface, stroke: "#2A3550", strokeWidth: 2 }),
  timing: all, transform: tf(0, 0, W, H, 10),
  animations: [entrance({ dur: 0.7, y: 30, scale: 0.97 })] }, "map_base");

// 강조 지역: 서울은 먼저 밝게, 부산은 도착할 때 강조색
const paintTo = (delay, dur, from, to) => ({ type: "paint", options: { duration: us(dur), delay: us(delay), easing: "easeOutCubic" },
  params: { "0%": { fillColor: from }, "100%": { fillColor: to } } });
add("map_seoul", regionShape(map, byName("서울특별시"), { timing: all, z: 20, fill: C.surface, stroke: "#2A3550", strokeWidth: 2,
  animations: [entrance({ dur: 0.7, y: 30, scale: 0.97 }), paintTo(0.8, 0.4, C.surface, "#5468A8")] }), "map_regions");
add("map_busan", regionShape(map, byName("부산광역시"), { timing: all, z: 21, fill: C.surface, stroke: "#2A3550", strokeWidth: 2,
  animations: [entrance({ dur: 0.7, y: 30, scale: 0.97 }), paintTo(3.2, 0.35, C.surface, C.accent)] }), "map_regions");

// 경로: 1.6초부터 1.6초 동안 그린다
add("map_route", routeShape(map, SEOUL, BUSAN, { timing: all, z: 30, color: C.accent, width: 9, bend: -0.28,
  animations: [{ type: "strokeDraw", options: { duration: us(1.6), delay: us(1.6), easing: "easeInOutCubic" }, params: { fill: "hidden" } }] }), "map_route");

// 핀: 크기 팝 (easeOutBack)
const pop = (delay) => holdFrom({ type: "keyframes", options: { duration: us(0.45), delay: 0, easing: "linear" },
  params: { "0%": { opacity: 0, scale: 0.2, easing: "easeOutBack" }, "100%": { opacity: 1, scale: 1 } } }, delay);
add("map_pin_seoul", pinShape(map, SEOUL, { timing: all, z: 32, size: 30, fill: C.text, ring: C.accent, animations: [pop(0.9)] }), "map_pins");
add("map_pin_busan", pinShape(map, BUSAN, { timing: all, z: 33, size: 30, fill: C.text, ring: C.accent, animations: [pop(3.2)] }), "map_pins");

// 지명 라벨
const label = (id, text, lonlat, dx, delay) => {
  const [x, y] = map.point(lonlat);
  add(id, { type: "Text", text, timing: all, transform: tf(Math.round(x + dx), Math.round(y - 30), 200, 60, 34),
    style: { ...font(brand.fonts.body, "/fonts/noto500.ttf"), fontSize: 40, color: C.text, align: "left", verticalAlign: "center",
      shadow: { color: "#000000", alpha: 0.5, blur: 8, offsetX: 0, offsetY: 2 } },
    animations: [entrance({ dur: 0.4, delay, x: -16, y: 0, scale: 1 })] }, "map_labels");
};
label("map_label_seoul", "서울", SEOUL, 30, 1.0);
label("map_label_busan", "부산", BUSAN, 30, 3.3);

// 카메라: 경로 가운데로 1 → 1.55배, 화면 위쪽(740)에 둔다
const [ax, ay] = map.point(SEOUL), [bx, by] = map.point(BUSAN);
const mx = (ax + bx) / 2, my = (ay + by) / 2, Z = 1.55, targetY = 740;
const cam = [
  { t: 1.4, cx: W / 2, cy: H / 2, zoom: 1, easing: "easeInOutCubic" },
  { t: 3.4, cx: mx, cy: my + (H / 2 - targetY) / Z, zoom: Z },
];
for (const id of Object.keys(clips)) clips[id].animations.push(mapCamera(clips[id], cam, { W, H, us, clipFrom: 0 }));

// 아래 가림막 + 카피
const scrim = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H * 0.42}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">`
  + `<stop offset="0" stop-color="${C.background}" stop-opacity="0"/><stop offset="0.45" stop-color="${C.background}" stop-opacity="0.92"/><stop offset="1" stop-color="${C.background}"/></linearGradient></defs>`
  + `<rect width="100%" height="100%" fill="url(#g)"/></svg>`;
add("copy_scrim", { type: "Image", src: svgUrl(scrim), timing: all, transform: tf(0, H * 0.58, W, H * 0.42, 40),
  animations: [holdFrom({ type: "keyframes", options: { duration: us(0.6), delay: 0, easing: "linear" }, params: at(0, [{ opacity: 0, y: 120, easing: "easeOutCubic" }, { opacity: 1, y: 0 }]) }, 3.5)] }, "copy");
add("copy_sub", { type: "Text", text: "오늘 밤 12시까지 주문하면", timing: all, transform: tf(80, 1440, 920, 70, 45),
  style: { ...font(brand.fonts.body, "/fonts/noto500.ttf"), fontSize: 46, color: C.muted, align: "left", verticalAlign: "center" },
  animations: [entrance({ dur: 0.5, delay: 3.8, y: 30 })] }, "copy");
add("copy_head", { type: "Text", text: "내일 아침 도착", timing: all, transform: tf(80, 1520, 920, 170, 46),
  style: { ...font(brand.fonts.display, "/fonts/bhs.ttf"), fontSize: 140, color: C.text, align: "left", verticalAlign: "center" },
  animations: [entrance({ dur: 0.6, delay: 3.8, index: 1, y: 50, scale: 0.94 })] }, "copy");
const late = (a) => ({ display: { from: us(a), to: us(DUR) }, duration: us(DUR - a), playbackRate: 1 });
add("copy_bar", { type: "Shape", src: "shape", shapeType: "rect", timing: late(4.3), transform: tf(84, 1712, 220, 10, 46), style: { fill: C.accent },
  animations: [{ type: "wipe", options: { duration: us(0.5), delay: 0, easing: "easeOutExpo" }, params: { direction: "right" } }] }, "copy");

// 룩 스택 + 조립
const look = lookStack({ W, H, duration: DUR, brand, dark: true });
const project = { settings: { width: W, height: H, fps: 30, duration: us(DUR), backgroundColor: C.background }, tracks: [], clips: {}, transitions: [] };
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
