// 샘플 전용: 화면 위쪽 번호 라벨 pill ("① 리퀴드 모션")
import { fontStyle } from "../fonts.mjs";
export default ({ shot, shotIndex, brand, W, us }) => {
  const P = shot.props, t = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const w = 60 + P.text.length * 44;
  return { clips: {
    [`label${shotIndex}_bg`]: { type: "Shape", name: "label-bg", src: "shape", shapeType: "pill", style: { fill: "#0B1230", borderRadius: 45 },
      timing: t(shot.from, shot.to), transform: { x: Math.round((W - w) / 2), y: 150, width: w, height: 90, angle: 0, opacity: 0.85, zIndex: 60 } },
    [`label${shotIndex}_t`]: { type: "Text", name: "label", text: P.text, timing: t(shot.from, shot.to),
      transform: { x: Math.round((W - w) / 2), y: 150, width: w, height: 90, angle: 0, opacity: 1, zIndex: 61 },
      style: { ...fontStyle(brand.fonts.display), fontSize: 44, color: "#FFFFFF", align: "center", verticalAlign: "center" } },
  }, trackOf: { [`label${shotIndex}_bg`]: "labelBg", [`label${shotIndex}_t`]: "label" } };
};
