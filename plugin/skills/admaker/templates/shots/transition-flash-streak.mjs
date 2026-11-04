// 샷 카드 references/shots/transition-flash-streak.md 의 참조 구현.
// 빠른 선 몇 가닥이 사선으로 화면을 가로지르고, 마지막 선이 지나가는 순간 화면이 브랜드 색으로 번쩍이며 소재가 바뀐다.
// props: { at: 컷 초(번쩍임 최고점), color: 번쩍임·선 색, angle: 선 기울기(도, 기본 −28), count: 선 수(기본 4),
//          sweep: 선 하나가 가로지르는 시간(초, 기본 0.18), gap: 선 사이(프레임, 기본 2), flash: 최대 불투명도(기본 0.85),
//          blend: 번쩍임 섞기(기본 "normal" = 색이 또렷한 면, "screen" = 소재가 그 색으로 빛남. 밝은 소재에서는 약함), dir: 1 = 왼→오 / −1 }
// 선은 굵기·길이가 다른 Shape rectangle, x 이동 + motionBlur. 번쩍임은 프레임 가득 Shape, 2프레임 올라가고 4프레임 내려감.
import { blurFor } from "../motion.mjs";

export default ({ shot, brand, W, H, FPS, us }) => {
  const P = shot.props, f = 1 / FPS, sx = W / 1080;
  const color = P.color ?? brand.colors?.accent ?? "#3D7BFF";
  const angle = P.angle ?? -28, count = P.count ?? 4, sweep = P.sweep ?? 0.18, gap = (P.gap ?? 2) * f, dir = P.dir ?? 1;
  const peak = P.flash ?? 0.9, blend = P.blend ?? "normal";
  const diag = Math.hypot(W, H), travel = Math.round((W + diag * 0.6) * dir);
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const id = (s) => `flash${P.index ?? 0}_${s}`;
  const clips = {}, trackOf = {};
  // 선: 마지막 선이 화면 가운데를 지나는 순간 = at. 앞 선일수록 일찍, 가늘고 짧게 → 굵은 마지막 선
  const widths = [14, 30, 8, 64, 18, 40].map((w) => Math.round(w * sx));
  const colors = [color, "#FFFFFF"];
  for (let i = 0; i < count; i++) {
    const t0 = P.at - sweep / 2 - (count - 1 - i) * gap;
    const w = widths[i % widths.length] * (i === count - 1 ? 1.6 : 1), len = Math.round(diag * (0.9 + 0.1 * (i % 3)));
    const yJit = Math.round(((i * 137) % 400 - 200) * sx); // 결정적 흩뿌림
    const vx = travel / (sweep * FPS);
    clips[id(`line${i}`)] = {
      // 색 선은 add로 섞어 어떤 소재 위에서도 밝게 보이게 (normal이면 어두운 색 위에서 묻힘)
      type: "Shape", name: `flash-line-${i}`, src: "shape", shapeType: "rectangle", style: { fill: colors[i % 2], ...(i % 2 ? {} : { blendMode: "add" }) },
      timing: timing(t0, t0 + sweep),
      transform: { x: Math.round(W / 2 - w / 2 - travel / 2), y: Math.round(H / 2 - len / 2 + yJit), width: w, height: len, angle: 90 + angle, opacity: 1, zIndex: 72 },
      animations: [{ type: "keyframes", options: { duration: us(sweep), delay: 0, easing: "linear" },
        params: { "0%": { x: 0, motionBlur: blurFor(vx) }, "100%": { x: travel, motionBlur: blurFor(vx) } } }],
    };
    trackOf[id(`line${i}`)] = "trans4";
  }
  // 번쩍임: at − 2프레임에 0 → at에 최고 → at + 4프레임에 0
  const a = P.at - 2 * f, b = P.at + 4 * f;
  clips[id("flash")] = {
    type: "Shape", name: "flash-fill", src: "shape", shapeType: "rectangle", style: { fill: color, blendMode: blend },
    timing: timing(a, b), transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1, zIndex: 71 },
    animations: [{ type: "keyframes", options: { duration: us(b - a), delay: 0, easing: "linear" },
      params: { "0%": { opacity: 0, easing: "easeOutQuad" }, "33.33%": { opacity: peak, easing: "easeInQuad" }, "100%": { opacity: 0 } } }],
  };
  trackOf[id("flash")] = "trans4";
  return { clips, trackOf };
};
