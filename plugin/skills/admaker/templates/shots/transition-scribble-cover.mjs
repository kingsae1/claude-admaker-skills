// 샷 카드 references/shots/transition-scribble-cover.md 의 참조 구현.
// 낙서 덮기: 굵은 마커 획이 지그재그로 화면을 칠해 덮고, 덮인 순간 소재가 바뀌고, 같은 지그재그 획이 다시 지나가며 그 자리부터 다음 장면이 드러난다(트랙 매트, 엔진 3.0.13+).
// 손그림 샷(hand-drawn-emphasis, handwritten-title)과 같은 톤. path + stroke + strokeDraw + 트랙 매트라 앱으로 그대로 간다.
// props: { at: 컷 초, color?, rows?: 지그재그 줄 수(기본 6), grow?: 덮는 시간(초, 기본 0.36), clear?: 지우는 시간(초, 기본 0.32), seed? }
import { pathToSvg, roughenPath } from "../draw.mjs";

export default ({ shot, brand, W, H, FPS, us }) => {
  const P = shot.props, f = 1 / FPS;
  const color = P.color ?? brand.colors?.accent ?? "#FFD43B";
  const rows = P.rows ?? 6, grow = P.grow ?? 0.36, clear = P.clear ?? 0.32;
  // 줄 간격보다 획을 굵게(1.45배) 해서 이음새 없이 덮는다. 위아래·양옆으로 화면 밖까지
  const gap = H / rows, sw = Math.ceil(gap * 1.45), m = sw;
  const cmds = [{ op: "M", x: -m, y: gap * 0.5 }];
  for (let i = 0; i < rows; i++) {
    const y0 = gap * (i + 0.5), y1 = gap * (i + 1.5);
    cmds.push({ op: "L", x: W + m, y: y0 + gap * 0.25 });
    if (i < rows - 1) cmds.push({ op: "L", x: -m, y: y1 - gap * 0.1 });
  }
  const d = pathToSvg(roughenPath(cmds, { amount: gap * 0.06, step: 120, seed: P.seed ?? 4 }));
  const box = { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1, zIndex: 70 };
  const style = { path: d, viewBox: [0, 0, W, H], fill: "transparent", fillOpacity: 0, stroke: { color, width: sw, cap: "round", join: "round" } };
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const id = (s) => `scribble${P.index ?? 0}_${s}`;
  const clips = {
    // 1. 칠하기: 컷 1프레임 전에 다 덮음
    [id("in")]: { type: "Shape", name: "scribble-in", src: "shape", shapeType: "path", style, transform: box, timing: timing(P.at - f - grow, P.at - f),
      animations: [{ type: "strokeDraw", options: { duration: us(grow), delay: 0, easing: "easeInCubic" }, params: { fill: "none" } }] },
    // 2. 컷 앞뒤 1프레임은 꽉 찬 사각형 (획 사이 틈 방지)
    [id("hold")]: { type: "Shape", name: "scribble-hold", src: "shape", shapeType: "rectangle", style: { fill: color },
      timing: timing(P.at - f, P.at + f), transform: box },
    // 3. 지우기: 색 화면에 같은 지그재그 획을 "구멍"으로 그린다(트랙 매트 alphaInverted). 획이 지나간 자리부터 다음 장면이 드러남.
    //    strokeDraw를 앞으로만 쓰므로 앱(direction reverse를 보존하지 않음)에서도 같게 보인다
    [id("out")]: { type: "Shape", name: "scribble-out", src: "shape", shapeType: "rectangle",
      style: { fill: color, matte: { clipId: id("eraser"), mode: "alphaInverted" } },
      timing: timing(P.at + f, P.at + f + clear), transform: box },
    [id("eraser")]: { type: "Shape", name: "scribble-eraser", src: "shape", shapeType: "path", style, transform: { ...box, zIndex: 69 },
      timing: timing(P.at + f, P.at + f + clear),
      animations: [{ type: "strokeDraw", options: { duration: us(clear), delay: 0, easing: "easeOutCubic" }, params: { fill: "none" } }] },
  };
  return { clips, trackOf: Object.fromEntries(Object.keys(clips).map((k) => [k, "trans1"])) };
};
