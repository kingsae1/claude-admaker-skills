// 샷 함수 예시: 샷 카드 references/shots/hook-number-slam.md 의 참조 구현을 ProjectJSON 클립으로 만든다.
// Text style 필드, 글자 필드 이름(text), characterAnimation 위치는 엔진 버전마다 다를 수 있으므로
// admaker 앱에서 내보낸 참조 JSON(ref/)과 대조해 맞춘다. 아래는 구조를 보여주는 예시다.
import fs from "node:fs";
import { fontStyle } from "../fonts.mjs";
const baseTextStyle = JSON.parse(fs.readFileSync("ref/text-style.json", "utf8"));

export default ({ shot, brand, W, H, us }) => {
  const from = us(shot.from), to = us(shot.to);
  const timing = (a, b) => ({ display: { from: a, to: b }, duration: b - a, playbackRate: 1 });
  const big = Math.round(H * 0.36), small = Math.round(H * 0.034);
  return {
    clips: {
      [`${shot.card}_num`]: {
        type: "Text", name: "number", text: shot.props.number,
        timing: timing(from, to),
        transform: { x: W * 0.074, y: H * 0.30, width: W * 0.852, height: big * 1.2, angle: 0, opacity: 1, zIndex: 20 },
        style: { ...baseTextStyle, ...fontStyle(/^[\d.,%+\-$₩]+$/.test(shot.props.number) && brand.fonts.numeric ? brand.fonts.numeric : brand.fonts.display), fontSize: big, color: brand.colors.accent,
          characterAnimation: [{ type: "slam", duration: 0.35, stagger: 0.05, staggerMode: "char", easing: "easeOutQuart" }] },
      },
      [`${shot.card}_cap`]: {
        type: "Text", name: "caption", text: shot.props.caption,
        timing: timing(from + 500000, to),
        transform: { x: W * 0.074, y: H * 0.30 + big * 1.25, width: W * 0.852, height: small * 2.6, angle: 0, opacity: 1, zIndex: 20 },
        style: { ...baseTextStyle, ...fontStyle(brand.fonts.body), fontSize: small, color: brand.colors.text,
          characterAnimation: [{ type: "line_rise", duration: 0.4, stagger: 0.08, staggerMode: "line", easing: "easeOutCubic" }] },
      },
    },
    trackOf: { [`${shot.card}_num`]: "text", [`${shot.card}_cap`]: "text" },
  };
};
