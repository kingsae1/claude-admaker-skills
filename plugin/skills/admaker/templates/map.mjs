// 지도 샷 도우미: GeoJSON → 화면 좌표 → SVG Image(바탕) · Shape path(강조 지역, 경로) · 핀 좌표 · 줌 카메라.
// 엔진 기본 클립과 모션만 써서 렌더 하니스와 admaker 광고 불러오기에서 같게 나온다 (references/engine-recipes.md §4.1).
// 필요: npm i d3-geo   데이터: Natural Earth(퍼블릭 도메인), 행정경계는 출처를 CREDITS에 적는다.
import { geoMercator, geoPath } from "d3-geo";

const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const r1 = (n) => Math.round(n * 10) / 10;

/** box [x, y, w, h] 안에 features가 꽉 차도록 맞춘 메르카토르 투영. 반환값은 [lon, lat] → [x, y] 함수 */
export function makeProjection(features, box) {
  const [x, y, w, h] = box;
  const proj = geoMercator().fitExtent([[x, y], [x + w, y + h]], { type: "FeatureCollection", features });
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

/** 바탕 지도 한 장 (전체 프레임 크기 SVG Image src). 소재(영상) 위에 얹으므로 면은 기본 반투명(fillOpacity 0.7) */
export function baseMapSrc(map, features, { W, H, fill, fillOpacity = 0.7, stroke, strokeWidth = 1.5 }) {
  const paths = features.map((f) => `<path d="${map.path(f)}"/>`).join("");
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<g fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round">${paths}</g></svg>`);
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
