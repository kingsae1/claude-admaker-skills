// 지도 샷 도우미: GeoJSON → 화면 좌표 → SVG Image(바탕) · Shape path(강조 지역, 경로) · 핀 좌표 · 줌 카메라.
// 엔진 기본 클립과 모션만 써서 렌더 하니스와 admaker 광고 불러오기에서 같게 나온다 (references/engine-recipes.md §4.1).
// 필요: npm i d3-geo   데이터: Natural Earth(퍼블릭 도메인), 행정경계는 출처를 CREDITS에 적는다.
import { geoMercator, geoPath } from "d3-geo";

const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const r1 = (n) => Math.round(n * 10) / 10;

/**
 * 화면비별 지도 상자와 카피 자리. 지도가 "어디인지" 읽히려면 나라 모양이 화면 높이의 큰 부분을 차지해야 한다.
 * - 세로(9:16): 지도 위, 카피 아래 28%. 1080×1920이면 [90, 200, 900, 1152]
 * - 가로(16:9): 지도는 한쪽에 프레임 높이 거의 전부(88%), 카피는 반대쪽 세로 단. 지도를 위, 카피를 아래로 두면
 *   나라가 높이 60% 남짓으로 작아지고 줌에서 잘려 무슨 지도인지 안 읽힌다
 * - 정사각·4:5: 지도 위 2/3, 카피 아래
 * side: 가로일 때 지도를 둘 쪽("right" | "left")
 */
export function mapLayout(W, H, { side = "right" } = {}) {
  const r = W / H;
  const R = (a) => a.map((n) => Math.round(n));
  if (r >= 1.2) {
    const mw = W * 0.56, mx = side === "right" ? W * 0.97 - mw : W * 0.03;
    const cx = side === "right" ? W * 0.06 : W * 0.6;
    return { orient: "landscape", side, box: R([mx, H * 0.06, mw, H * 0.88]), copy: R([cx, H * 0.2, W * 0.34, H * 0.62]) };
  }
  if (r <= 0.8) return { orient: "portrait", box: R([W * 0.0833, H * 0.104, W * 0.8333, H * 0.6]), copy: R([W * 0.074, H * 0.72, W * 0.852, H * 0.22]) };
  return { orient: "square", box: R([W * 0.12, H * 0.05, W * 0.76, H * 0.66]), copy: R([W * 0.07, H * 0.74, W * 0.86, H * 0.2]) };
}

/**
 * box [x, y, w, h] 안에 features가 꽉 차도록 맞춘 메르카토르 투영. 반환값은 [lon, lat] → [x, y] 함수
 * bounds: [[서경, 남위], [동경, 북위]]를 주면 features 대신 이 범위를 상자에 맞춘다.
 *   대상 나라보다 조금 넓게 잡으면 이웃 땅(예: 휴전선 위 북한)이 화면에 들어와 위치가 읽힌다.
 */
export function makeProjection(features, box, { bounds = null } = {}) {
  const [x, y, w, h] = box;
  const target = bounds
    ? { type: "Feature", geometry: { type: "Polygon", coordinates: [[[bounds[0][0], bounds[0][1]], [bounds[0][0], bounds[1][1]], [bounds[1][0], bounds[1][1]], [bounds[1][0], bounds[0][1]], [bounds[0][0], bounds[0][1]]]] } }
    : { type: "FeatureCollection", features };
  const proj = geoMercator().fitExtent([[x, y], [x + w, y + h]], target);
  const path = geoPath(proj).digits(1);
  const point = (lonlat) => proj(lonlat).map(r1);
  return { proj, path, point };
}

/** feature 하나의 SVG path와 화면 경계 */
export function regionPath(map, feature) {
  const d = map.path(feature);
  const [[x0, y0], [x1, y1]] = map.path.bounds(feature);
  return { d, box: [r1(x0), r1(y0), r1(x1 - x0), r1(y1 - y0)] };
}

/**
 * 바탕 지도 한 장 (전체 프레임 크기 SVG Image src).
 * 소재(영상) 위에 얹으므로 기본은 선만: 면 없음, 흰 경계선 + 그림자(어느 영상 위에서도 보이게). 면을 깔면 영상이 뿌옇게 묻힌다(Q11).
 * 면이 꼭 필요하면 fill·fillOpacity를 주되, 작은 인셋 지도에서만 쓴다.
 *
 * 알아보기 쉽게 하는 선택 항목(가로 16:9에서 권장):
 * - context: 이웃 땅 features(예: world-atlas의 중국·일본·북한). 흐린 선 + 옅은 면으로 해안선 윤곽을 보여 줘서 "한반도"로 읽힌다
 * - landFill·landOpacity: 대상 땅만 옅게 칠해 땅/바다가 갈린다(바다·영상 나머지는 그대로). 어두운 소재는 흰색 0.1–0.15, 밝은 소재는 어두운 색 0.2–0.3
 * - fade: 지도 상자 [x, y, w, h]. 주면 이웃 땅이 상자 밖으로 갈수록 사라져 카피 쪽 화면이 깨끗하다
 */
export function baseMapSrc(map, features, { W, H, fill = "none", fillOpacity = 0, stroke = "#FFFFFF", strokeOpacity = 0.85, strokeWidth = 2.5, shadow = 0.6,
  context = null, contextStroke = "#FFFFFF", contextStrokeOpacity = 0.5, contextFill = "#FFFFFF", contextFillOpacity = 0.06, contextStrokeWidth = 1.6,
  landFill = null, landOpacity = 0.12, fade = null } = {}) {
  const paths = features.map((f) => `<path d="${map.path(f)}"/>`).join("");
  const defs = [];
  if (shadow) defs.push(`<filter id="s" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="${shadow}"/></filter>`);
  if (fade) {
    const [fx, fy, fw, fh] = fade;
    defs.push(`<radialGradient id="fg" gradientUnits="userSpaceOnUse" cx="${r1(fx + fw / 2)}" cy="${r1(fy + fh / 2)}" r="${r1(Math.max(fw, fh) * 0.7)}">`
      + `<stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
      + `<mask id="fm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fg)"/></mask>`);
  }
  const ctx = context?.length
    ? `<g${fade ? ' mask="url(#fm)"' : ""} fill="${contextFill}" fill-opacity="${contextFillOpacity}" stroke="${contextStroke}" stroke-opacity="${contextStrokeOpacity}" stroke-width="${contextStrokeWidth}" stroke-linejoin="round">`
      + context.map((f) => `<path d="${map.path(f)}"/>`).join("") + "</g>"
    : "";
  const land = landFill ? `<g fill="${landFill}" fill-opacity="${landOpacity}" stroke="none">${paths}</g>` : "";
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs.length ? `<defs>${defs.join("")}</defs>` : ""}`
    + ctx + land
    + `<g${shadow ? ' filter="url(#s)"' : ""} fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}" stroke-linejoin="round">${paths}</g></svg>`);
}

/**
 * 이웃 땅(맥락) features: world-atlas(Natural Earth, 퍼블릭 도메인 데이터, 패키지 ISC)에서 이름으로 고른다.
 * 필요: npm i world-atlas topojson-client   CREDITS에 "Natural Earth via world-atlas" 를 적는다.
 * names 예: ["North Korea", "China", "Japan", "Russia"]
 */
export async function worldFeatures(names, { resolution = "50m" } = {}) {
  const { feature } = await import("topojson-client");
  const { createRequire } = await import("node:module");
  const topo = createRequire(import.meta.url)(`world-atlas/countries-${resolution}.json`);
  const all = feature(topo, topo.objects.countries).features;
  return names.map((n) => all.find((f) => f.properties.name === n)).filter(Boolean);
}

/** 강조 지역 Shape 클립 (path를 화면 좌표 그대로 쓰고 viewBox = 클립 상자) */
export function regionShape(map, feature, { timing, z = 22, fill, stroke, strokeWidth = 3, animations = [] }) {
  const { d, box } = regionPath(map, feature);
  return {
    type: "Shape", src: "shape", shapeType: "path", timing,
    transform: { x: box[0], y: box[1], width: box[2], height: box[3], angle: 0, opacity: 1, zIndex: z },
    style: { path: d, viewBox: box, fill, ...(stroke ? { stroke: { color: stroke, width: strokeWidth, join: "round" } } : {}) },
    animations,
  };
}

/** 두 점 사이 휘어진 경로 (bend: 직선 길이 대비 휘는 정도, 음수면 반대쪽) */
export function routeShape(map, from, to, { timing, z = 30, color, width = 10, bend = 0.25, animations = [] }) {
  const [ax, ay] = map.point(from), [bx, by] = map.point(to);
  const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
  const cx = r1(mx - dy * bend), cy = r1(my + dx * bend);
  const pad = width * 2;
  const x0 = Math.min(ax, bx, cx) - pad, y0 = Math.min(ay, by, cy) - pad;
  const x1 = Math.max(ax, bx, cx) + pad, y1 = Math.max(ay, by, cy) + pad;
  const box = [r1(x0), r1(y0), r1(x1 - x0), r1(y1 - y0)];
  return {
    type: "Shape", src: "shape", shapeType: "path", timing,
    transform: { x: box[0], y: box[1], width: box[2], height: box[3], angle: 0, opacity: 1, zIndex: z },
    style: { path: `M${ax} ${ay}Q${cx} ${cy} ${bx} ${by}`, viewBox: box, fill: "transparent", fillOpacity: 0, stroke: { color, width, cap: "round", join: "round" } },
    animations,
  };
}

/** 핀(원) Shape 클립: 화면 좌표 중심 */
export function pinShape(map, lonlat, { timing, z = 32, size = 28, fill, ring, animations = [] }) {
  const [x, y] = map.point(lonlat);
  return {
    type: "Shape", src: "shape", shapeType: "circle", timing,
    transform: { x: r1(x - size / 2), y: r1(y - size / 2), width: size, height: size, angle: 0, opacity: 1, zIndex: z },
    style: { fill, ...(ring ? { stroke: { color: ring, width: Math.max(2, size * 0.18) } } : {}) },
    animations,
  };
}

/**
 * 지도 줌 카메라: 화면의 한 점(cx, cy)을 프레임 가운데로 끌어오며 zoom.
 * 지도에 속한 모든 클립에 같은 키를 넣어야 한 장처럼 움직인다. 엔진 scale은 클립 중심 기준이라 위치를 보정한다.
 * keys: [{ t: 광고 기준 초, cx, cy, zoom, easing? }], 첫 키는 보통 { cx: W/2, cy: H/2, zoom: 1 }
 * clipFrom: 클립 시작(초). 지도 클립은 모두 첫 키 이전(보통 0)에 시작시키고, 늦게 나타날 요소는 입장 모션으로 숨긴다.
 * 엔진은 delay 전에는 keyframes를 적용하지 않으므로 delay를 쓰지 않고 클립 시작~첫 키를 첫 키 값으로 붙잡는다.
 */
export function mapCamera(clip, keys, { W, H, us, clipFrom = 0 }) {
  if (keys[0].t < clipFrom) throw new Error("mapCamera: 클립이 첫 카메라 키보다 늦게 시작합니다. 클립을 더 일찍 시작시키세요");
  const t = clip.transform;
  const ox = t.x + t.width / 2, oy = t.y + t.height / 2;
  const total = keys.at(-1).t - clipFrom;
  const stop = (k) => {
    const sx = (ox - k.cx) * k.zoom + W / 2, sy = (oy - k.cy) * k.zoom + H / 2;
    return { x: r1(sx - ox), y: r1(sy - oy), scale: k.zoom };
  };
  const params = {};
  if (keys[0].t > clipFrom) params["0%"] = stop(keys[0]);
  for (const k of keys) {
    const pct = total > 0 ? `${(((k.t - clipFrom) / total) * 100).toFixed(3)}%` : "0%";
    params[pct] = { ...stop(k), ...(k.easing ? { easing: k.easing } : {}) };
  }
  return { type: "keyframes", options: { duration: us(total), delay: 0, easing: "linear" }, params };
}

/**
 * 참고 지명(작은 점 + 이름): 주인공 지명 말고도 큰 도시 2–4곳을 흐리게 찍어 두면 지도가 "어느 나라 어디쯤"인지 읽힌다.
 * places: [{ id, name, lonlat, dx?, dy?, align? }]. 반환: { [id]: clip } (점 `${id}_dot`, 이름 `${id}`)
 * 이름 Text는 font(fontStyle 결과)를 펼쳐 넣는다. 지도 클립이므로 mapCamera 키를 같이 넣는다.
 */
export function placeMarks(map, places, { timing, font = {}, size = 28, color = "#FFFFFF", opacity = 0.8, dot = 10, z = 26, animations = () => [] }) {
  const out = {};
  for (const p of places) {
    const [x, y] = map.point(p.lonlat);
    const dx = p.dx ?? dot + 8, dy = p.dy ?? 0, left = (p.align ?? (dx >= 0 ? "left" : "right")) === "left";
    const w = Math.round(size * (p.name.length + 1)), h = Math.round(size * 1.6);
    out[`${p.id}_dot`] = { type: "Shape", src: "shape", shapeType: "circle", timing,
      transform: { x: r1(x - dot / 2), y: r1(y - dot / 2), width: dot, height: dot, angle: 0, opacity, zIndex: z }, style: { fill: color }, animations: animations(p, "dot") };
    out[p.id] = { type: "Text", text: p.name, timing,
      transform: { x: Math.round(left ? x + dx : x + dx - w), y: Math.round(y + dy - h / 2), width: w, height: h, angle: 0, opacity, zIndex: z + 1 },
      style: { ...font, fontSize: size, color, align: left ? "left" : "right", verticalAlign: "center", shadow: { color: "#000000", alpha: 0.55, blur: 8, offsetX: 0, offsetY: 2 } },
      animations: animations(p, "label") };
  }
  return out;
}

/**
 * 카메라 키 하나를 "보여 줘야 할 점들이 상자 안에 다 들어오게" 계산한다. 고정 zoom(1.55) 대신 쓴다.
 * lonlats: 화면에 남아야 할 점(출발·도착, 참고 도시), box: 그 점들이 들어갈 화면 상자 [x, y, w, h](보통 mapLayout().box)
 * pad: 점 둘레 여백(px, 라벨 자리 포함). maxZoom: 가로 16:9은 1.3 안팎, 세로는 1.6까지.
 * 반환 { cx, cy, zoom } 을 mapCamera 키에 { t, ...fitCamera(...) } 로 넣는다.
 */
export function fitCamera(map, lonlats, box, { W, H, pad = 140, maxZoom = 1.6, minZoom = 1 }) {
  const pts = lonlats.map((p) => map.point(p));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const [bx, by, bw, bh] = box;
  const zoom = Math.max(minZoom, Math.min(maxZoom, bw / (x1 - x0), bh / (y1 - y0)));
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return { cx: r1(mx - (bx + bw / 2 - W / 2) / zoom), cy: r1(my - (by + bh / 2 - H / 2) / zoom), zoom: Math.round(zoom * 1000) / 1000 };
}
