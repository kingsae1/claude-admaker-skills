// 코드 씬 샷(three 커스텀 씬 · script)의 공통 조립: Adapter 클립 하나 + 선택 문구(title).
// 직접 고르는 카드가 아니라 liquid-blobs / iso-city-3d / particle-logo 카드가 씁니다.
import { fontStyle } from "../fonts.mjs";

export function adapterShot({ shot, shotIndex = 0, brand, W, H, us }, { prefix, adapter, params, box, z = 35, enter = true }) {
  const P = shot.props, sx = W / 1080, sy = H / 1920, dur = P.dur ?? 3.5;
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const id = (s) => `${prefix}${shotIndex}_${s}`;
  const b = P.box ?? box;
  const clips = {
    [id("scene")]: { type: "Adapter", name: `${prefix}-scene`, adapter, src: adapter, params,
      timing: timing(P.at, P.at + dur), transform: { x: Math.round(b[0] * sx), y: Math.round(b[1] * sy), width: Math.round(b[2] * sx), height: Math.round(b[3] * sy), angle: 0, opacity: 1, zIndex: z },
      animations: enter ? [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens: [
        { to: { opacity: 0, scale: 0.94 }, duration: 0.25, ease: "power2.in", position: dur - 0.3 },
      ] } }] : [] },
  };
  const trackOf = { [id("scene")]: prefix };
  if (P.title) {
    const size = Math.round((P.titleSize ?? 72) * sx), y = Math.round((P.titleY ?? 1500) * sy), from = P.at + (P.titleAt ?? 0.8);
    clips[id("title")] = { type: "Text", name: `${prefix}-title`, text: P.title,
      timing: timing(from, P.at + dur), transform: { x: 60, y, width: W - 120, height: Math.round(size * 1.4), angle: 0, opacity: 1, zIndex: 45 },
      style: { ...fontStyle(brand.fonts?.display ?? { name: "Pretendard", weight: 900 }), fontSize: size, color: brand.colors?.text ?? "#FFFFFF", align: "center", verticalAlign: "center",
        letterSpacing: 4, shadow: { color: "#000000", alpha: 0.45, blur: 10, offsetX: 0, offsetY: 3 },
        characterAnimation: [{ type: "rise", duration: 0.5, stagger: 0.04, staggerMode: "char", easing: "power3.out" }] },
      animations: [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens: [
        { to: { opacity: 0, y: -30 * sy }, duration: 0.25, ease: "power2.in", position: Math.max(0, dur - (P.titleAt ?? 0.8) - 0.3) },
      ] } }] };
    trackOf[id("title")] = `${prefix}Title`;
  }
  return { clips, trackOf };
}
