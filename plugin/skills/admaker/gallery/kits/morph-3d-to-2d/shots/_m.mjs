// 모프 샘플 샷 공통 도우미 (coffee v3의 _v3.mjs와 같은 방식)
import { fontStyle as baseFontStyle } from "../fonts.mjs";
export const T = (us) => (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
// Pretendard CDN이 이 렌더 환경에서 막혀 있어 렌더 하니스(render/fonts/)의 로컬 파일을 쓴다. 앱에서는 이름으로 매칭된다.
export function fontStyle(tok) {
  const s = baseFontStyle(tok);
  if (s.fontFamily === "Pretendard") s.fontUrl = "/fonts/Pretendard-ExtraBold.woff2";
  return s;
}
export function text(t, { font, size, color, x = 0, y, w = 1080, h, z = 40, timing, align = "center", animations = [], name = "text", letterSpacing = 0, extra = {} }) {
  const boxH = h ?? size * 1.3, lineH = size * 1.3, top = y + (boxH - lineH) / 2;
  return { type: "Text", name, text: t, timing,
    transform: { x: Math.round(x), y: Math.round(top), width: Math.round(w), height: Math.round(lineH), angle: 0, opacity: 1, zIndex: z },
    style: { ...fontStyle(font), fontSize: size, color, align, verticalAlign: "center", letterSpacing, ...extra }, animations };
}
export function shape({ x, y, w, h, fill, z = 20, timing, name = "shape", shape = "rectangle", style = {}, animations = [], angle = 0 }) {
  return { type: "Shape", name, src: "shape", shapeType: shape, timing,
    style: { fill: fill ?? "transparent", ...(fill ? {} : { fillOpacity: 0 }), ...style },
    transform: { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h), angle, opacity: 1, zIndex: z }, animations };
}
export const gsap = (tweens) => ({ type: "gsapTimeline", options: { delay: 0 }, params: { tweens } });
export const wipe = (us, dur, dir = "up", easing = "easeOutExpo") => ({ type: "wipe", options: { duration: us(dur), delay: 0, easing }, params: { direction: dir } });
