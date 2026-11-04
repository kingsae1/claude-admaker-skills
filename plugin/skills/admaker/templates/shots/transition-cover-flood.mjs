// 샷 카드 references/shots/transition-cover-flood.md 의 참조 구현.
// 앞 장면의 점(로고 점·버튼·pill)이 원으로 부풀어 화면을 덮고, 덮인 동안 바닥 소재가 바뀌고, 원이 다른 점으로 줄어들며 다음 장면을 연다.
// props: { at: 컷 초, origin: [x, y] 부풀 점 (1080×1920 기준), to: [x, y] 줄어들 점 (기본 origin), color, seed: 시작 지름 px,
//          grow: 덮는 시간(초), shrink: 여는 시간(초) }
// 엔진 scale은 클립 중심 기준이라 원 클립 중심을 점에 둔다. delay 전에는 keyframes가 안 걸리므로 단계마다 클립을 나눈다.
import { farCorner } from "../motion.mjs";

export default ({ shot, brand, W, H, FPS, us }) => {
  const P = shot.props, f = 1 / FPS, sx = W / 1080, sy = H / 1920;
  const color = P.color ?? brand.colors?.accent ?? "#3D7BFF";
  const grow = P.grow ?? 0.3, shrink = P.shrink ?? 0.3, seed = (P.seed ?? 36) * sx;
  const o = [P.origin[0] * sx, P.origin[1] * sy], t = P.to ? [P.to[0] * sx, P.to[1] * sy] : o;
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const circle = ([x, y], r) => ({ x: Math.round(x - r), y: Math.round(y - r), width: Math.round(2 * r), height: Math.round(2 * r), angle: 0, opacity: 1, zIndex: 70 });
  const id = (s) => `flood${P.index ?? 0}_${s}`;
  const r1 = farCorner(o, W, H) + 4, r2 = farCorner(t, W, H) + 4;
  const clips = {
    // 1. 부풀기: 컷 1프레임 전에 화면을 다 덮는다. easeIn 계열로 컷에 부딪히듯
    [id("in")]: { type: "Shape", name: "flood-in", src: "shape", shapeType: "circle", style: { fill: color },
      timing: timing(P.at - f - grow, P.at - f), transform: circle(o, r1),
      animations: [{ type: "keyframes", options: { duration: us(grow), delay: 0, easing: "linear" },
        params: { "0%": { scale: seed / (2 * r1), easing: "easeInCubic" }, "100%": { scale: 1 } } }] },
    // 2. 컷 앞뒤 1프레임은 꽉 찬 사각형 (큰 원은 모서리가 비거나 이동하면 틈이 생김)
    [id("hold")]: { type: "Shape", name: "flood-hold", src: "shape", shapeType: "rectangle", style: { fill: color },
      timing: timing(P.at - f, P.at + f), transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1, zIndex: 70 } },
    // 3. 줄어들기: 다음 장면이 바깥부터 드러남. easeOut 계열로 빨리 열고 천천히 점으로
    [id("out")]: { type: "Shape", name: "flood-out", src: "shape", shapeType: "circle", style: { fill: color },
      timing: timing(P.at + f, P.at + f + shrink), transform: circle(t, r2),
      animations: [{ type: "keyframes", options: { duration: us(shrink), delay: 0, easing: "linear" },
        params: { "0%": { scale: 1, easing: "easeOutCubic" }, "100%": { scale: seed / (2 * r2) } } }] },
  };
  return { clips, trackOf: Object.fromEntries(Object.keys(clips).map((k) => [k, "trans1"])) };
};
