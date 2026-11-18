// 지도 샘플 샷 16:9: 서울 → 부산 배송 경로 (1920x1080, 6초)
// 9:16 샘플(sample-map.mjs)과 같은 이야기를 가로 화면에 맞게 다시 짰다.
// - 지도는 오른쪽에 프레임 높이 88%(mapLayout), 카피는 왼쪽 세로 단
// - 이웃 땅(북한·중국·일본) 흐린 윤곽 + 대상 땅 옅은 면 → 한반도로 읽힘
// - 참고 도시(대전·대구·광주·강릉·제주) 작은 점과 이름
// - 카메라는 고정 1.55배 대신 fitCamera: 경로와 참고 도시가 지도 상자 안에 남는 만큼만 다가감
// --before: 고치기 전 방식(세로 상자 비율을 그대로 옮기고 1.55배 줌, 선만) 비교용
import fs from "node:fs";
import { mapLayout, makeProjection, baseMapSrc, worldFeatures, regionShape, routeShape, pinShape, placeMarks, fitCamera, mapCamera } from "./map.mjs";
import { entrance, lookStack, holdFrom } from "./motion.mjs";
import { fontStyle } from "./fonts.mjs";
import { us } from "./timeline.mjs";

const W = 1920, H = 1080, DUR = 6;
const BEFORE = process.argv.includes("--before");
const LOCAL_FONTS = process.argv.includes("--local-fonts");
const FOOTAGE_SRC = LOCAL_FONTS ? "/footage.mp4" : "assets/input.mp4";
const brand = {
  colors: { background: "#0B0F1A", surface: "#1A2233", text: "#F5F7FA", muted: "#C9D1DE", accent: "#FF5A36", primary: "#3D5AFE" },
  fonts: { display: { name: "Black Han Sans" }, body: { name: "Noto Sans KR", weight: 500 } },
};
const C = brand.colors;
const font = (tok, local) => ({ ...fontStyle(tok), ...(LOCAL_FONTS ? { fontUrl: local } : {}) });
const BODY = ["/fonts/Pretendard-SemiBold.woff2"], HEAD = ["/fonts/Pretendard-ExtraBold.woff2"];

const geo = JSON.parse(fs.readFileSync(process.env.KOR_GEOJSON ?? "kor.geojson", "utf8"));
const features = geo.features;
const byName = (n) => features.find((f) => f.properties.name === n);

const L = mapLayout(W, H, { side: "right" });
const box = BEFORE ? [160, 112, 1600, 648] : L.box;
// 남한만 맞추면 휴전선 위가 잘려 섬처럼 보인다 → 북쪽(북한 일부)과 동서 바다를 조금 더 넣는다
const map = makeProjection(features, box, BEFORE ? {} : { bounds: [[124.2, 33.0], [131.0, 39.4]] });
const context = BEFORE ? null : await worldFeatures(["North Korea", "China", "Japan", "Russia"]);

const SEOUL = [126.978, 37.566], BUSAN = [129.075, 35.18];
const all = { display: { from: 0, to: us(DUR) }, duration: us(DUR), playbackRate: 1 };
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const tf = (x, y, w, h, z, opacity = 1) => ({ x, y, width: w, height: h, angle: 0, opacity, zIndex: z });
const at = (sec, pct) => ({ "0%": pct[0], "100%": pct[1] });

const clips = {};
const trackOf = {};
const add = (id, clip, track) => { clips[id] = { name: id, ...clip }; trackOf[id] = track; };
const IN = () => entrance({ dur: 0.7, y: 30, scale: 0.97 });

add("footage_0", { type: "Video", src: FOOTAGE_SRC, timing: { ...all, trim: { from: 0, to: us(DUR) } }, volume: 0, transform: tf(0, 0, W, H, 2), animations: [] }, "footage");
add("map_base", { type: "Image",
  src: baseMapSrc(map, features, BEFORE ? { W, H } : { W, H, context, landFill: "#FFFFFF", landOpacity: 0.12, fade: box }),
  timing: all, transform: tf(0, 0, W, H, 10), animations: [IN()] }, "map_base");

const paintTo = (delay, dur, from, to) => ({ type: "paint", options: { duration: us(dur), delay: us(delay), easing: "easeOutCubic" },
  params: { "0%": { fillColor: from }, "100%": { fillColor: to } } });
add("map_seoul", regionShape(map, byName("서울특별시"), { timing: all, z: 20, fill: "rgba(255,255,255,0)", stroke: "#FFFFFF", strokeWidth: 2.5,
  animations: [IN(), paintTo(0.8, 0.4, "rgba(255,255,255,0)", "rgba(255,255,255,0.55)")] }), "map_regions");
add("map_busan", regionShape(map, byName("부산광역시"), { timing: all, z: 21, fill: "rgba(255,255,255,0)", stroke: "#FFFFFF", strokeWidth: 2.5,
  animations: [IN(), paintTo(3.2, 0.35, "rgba(255,90,54,0)", "rgba(255,90,54,0.9)")] }), "map_regions");

add("map_route", routeShape(map, SEOUL, BUSAN, { timing: all, z: 30, color: C.accent, width: 9, bend: -0.28,
  animations: [{ type: "strokeDraw", options: { duration: us(1.6), delay: us(1.6), easing: "easeInOutCubic" }, params: { fill: "hidden" } }] }), "map_route");

const pop = (delay) => holdFrom({ type: "keyframes", options: { duration: us(0.45), delay: 0, easing: "linear" },
  params: { "0%": { opacity: 0, scale: 0.2, easing: "easeOutBack" }, "100%": { opacity: 1, scale: 1 } } }, delay);
add("map_pin_seoul", pinShape(map, SEOUL, { timing: all, z: 32, size: 30, fill: C.text, ring: C.accent, animations: [pop(0.9)] }), "map_pins");
add("map_pin_busan", pinShape(map, BUSAN, { timing: all, z: 33, size: 30, fill: C.text, ring: C.accent, animations: [pop(3.2)] }), "map_pins");

const label = (id, text, lonlat, dx, delay, size = 40) => {
  const [x, y] = map.point(lonlat);
  add(id, { type: "Text", text, timing: all, transform: tf(Math.round(x + dx), Math.round(y - 30), 200, 60, 34),
    style: { ...font(brand.fonts.body, BODY[0]), fontSize: size, color: C.text, align: "left", verticalAlign: "center",
      shadow: { color: "#000000", alpha: 0.6, blur: 8, offsetX: 0, offsetY: 2 } },
    animations: [entrance({ dur: 0.4, delay, x: -16, y: 0, scale: 1 })] }, "map_labels");
};
label("map_label_seoul", "서울", SEOUL, 28, 1.0, BEFORE ? 40 : 44);
label("map_label_busan", "부산", BUSAN, 28, 3.3, BEFORE ? 40 : 44);

// 참고 도시: 지도가 들어온 직후(0.5–0.8초) 흐리게 함께 나타남
const REF = [
  { id: "map_ref_daejeon", name: "대전", lonlat: [127.385, 36.351], dx: -18 },
  { id: "map_ref_daegu", name: "대구", lonlat: [128.601, 35.871], dx: -18 },
  { id: "map_ref_gwangju", name: "광주", lonlat: [126.852, 35.16], dx: -30 },
  { id: "map_ref_gangneung", name: "강릉", lonlat: [128.876, 37.752] },
  { id: "map_ref_jeju", name: "제주", lonlat: [126.531, 33.4996], dx: -18, dy: -6 },
];
if (!BEFORE) {
  const marks = placeMarks(map, REF, { timing: all, font: font(brand.fonts.body, BODY[0]), size: 30, color: C.muted, opacity: 0.9, dot: 10, z: 26,
    animations: (p, kind) => [entrance({ dur: 0.5, delay: 0.5 + REF.indexOf(p) * 0.06, y: 0, x: kind === "label" ? -10 : 0, scale: kind === "dot" ? 0.5 : 1 })] });
  for (const [id, c] of Object.entries(marks)) add(id, c, "map_refs");
}

// 카메라
let cam;
if (BEFORE) {
  const [ax, ay] = map.point(SEOUL), [bx, by] = map.point(BUSAN);
  const Z = 1.55, targetY = 740 * H / 1920;
  cam = [{ t: 1.4, cx: W / 2, cy: H / 2, zoom: 1, easing: "easeInOutCubic" }, { t: 3.4, cx: (ax + bx) / 2, cy: (ay + by) / 2 + (H / 2 - targetY) / Z, zoom: Z }];
} else {
  const keep = [SEOUL, BUSAN, ...REF.filter((r) => r.name !== "제주").map((r) => r.lonlat)];
  cam = [{ t: 1.4, cx: W / 2, cy: H / 2, zoom: 1, easing: "easeInOutCubic" }, { t: 3.4, ...fitCamera(map, keep, box, { W, H, pad: 110, maxZoom: 1.3 }) }];
}
for (const id of Object.keys(clips).filter((k) => k.startsWith("map_"))) clips[id].animations.push(mapCamera(clips[id], cam, { W, H, us, clipFrom: 0 }));

// 카피
if (BEFORE) {
  // 세로 샘플 구성을 그대로: 아래 30% 글자 띠
  const scrim = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H * 0.3}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="${C.background}" stop-opacity="0"/><stop offset="1" stop-color="${C.background}" stop-opacity="0.6"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  add("copy_scrim", { type: "Image", src: svgUrl(scrim), timing: all, transform: tf(0, H * 0.7, W, H * 0.3, 40),
    animations: [holdFrom({ type: "keyframes", options: { duration: us(0.6), delay: 0, easing: "linear" }, params: at(0, [{ opacity: 0, y: 80, easing: "easeOutCubic" }, { opacity: 1, y: 0 }]) }, 3.5)] }, "copy");
  add("copy_sub", { type: "Text", text: "오늘 밤 12시까지 주문하면", timing: all, transform: tf(140, 800, 1200, 60, 45),
    style: { ...font(brand.fonts.body, BODY[0]), fontSize: 40, color: "#D5DAE3", shadow: { color: "#000000", alpha: 0.55, blur: 12, offsetX: 0, offsetY: 3 }, align: "left", verticalAlign: "center" },
    animations: [entrance({ dur: 0.5, delay: 3.8, y: 30 })] }, "copy");
  add("copy_head", { type: "Text", text: "내일 아침 도착", timing: all, transform: tf(140, 860, 1400, 140, 46),
    style: { ...font(brand.fonts.display, HEAD[0]), fontSize: 110, color: C.text, shadow: { color: "#000000", alpha: 0.55, blur: 12, offsetX: 0, offsetY: 3 }, align: "left", verticalAlign: "center" },
    animations: [entrance({ dur: 0.6, delay: 3.8, index: 1, y: 50, scale: 0.94 })] }, "copy");
} else {
  // 왼쪽 세로 단: 왼쪽 가장자리 그라데이션 받침(최대 0.55, 화면 왼쪽 45%만)
  const [cx, cy, cw, ch] = L.copy;
  const sw = Math.round(W * 0.45);
  const scrim = `<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">`
    + `<stop offset="0" stop-color="${C.background}" stop-opacity="0.55"/><stop offset="0.6" stop-color="${C.background}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.background}" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  add("copy_scrim", { type: "Image", src: svgUrl(scrim), timing: all, transform: tf(0, 0, sw, H, 40),
    animations: [holdFrom({ type: "keyframes", options: { duration: us(0.6), delay: 0, easing: "linear" }, params: at(0, [{ opacity: 0, x: -120, easing: "easeOutCubic" }, { opacity: 1, x: 0 }]) }, 3.4)] }, "copy");
  const shadow = { color: "#000000", alpha: 0.55, blur: 12, offsetX: 0, offsetY: 3 };
  add("copy_sub", { type: "Text", text: "오늘 밤 12시까지 주문하면", timing: all, transform: tf(cx, cy + 150, cw + 60, 64, 45),
    style: { ...font(brand.fonts.body, BODY[0]), fontSize: 44, color: "#D5DAE3", shadow, align: "left", verticalAlign: "center" },
    animations: [entrance({ dur: 0.5, delay: 3.7, y: 30 })] }, "copy");
  add("copy_head", { type: "Text", text: "내일 아침\n도착", timing: all, transform: tf(cx, cy + 230, cw, 300, 46),
    style: { ...font(brand.fonts.display, HEAD[0]), fontSize: 132, lineHeight: 1.1, color: C.text, shadow, align: "left", verticalAlign: "top" },
    animations: [entrance({ dur: 0.6, delay: 3.7, index: 1, y: 50, scale: 0.94 })] }, "copy");
  const late = (a) => ({ display: { from: us(a), to: us(DUR) }, duration: us(DUR - a), playbackRate: 1 });
  add("copy_bar", { type: "Shape", src: "shape", shapeType: "rect", timing: late(4.2), transform: tf(cx + 4, cy + 560, 240, 12, 46), style: { fill: C.accent },
    animations: [{ type: "wipe", options: { duration: us(0.5), delay: 0, easing: "easeOutExpo" }, params: { direction: "right" } }] }, "copy");
}

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
console.log(`${out}: ${Object.keys(project.clips).length} clips, camera →`, JSON.stringify(cam.at(-1)));
