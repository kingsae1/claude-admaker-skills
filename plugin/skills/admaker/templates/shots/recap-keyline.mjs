// 줄거리 요약(리캡) — 배우 결정적 대사 자막. 내레이션 자막과 구별되게 따옴표·노랑·굵게, 화면 아래쪽 2줄 안.
// 앱 MCP place_story_shots의 keyLine 자막과 같은 모양이다 (references/recap-highlight.md §2.2).
// recap.mjs place가 SHOTS에 { card: "recap-keyline", from, to, props: { text } }로 넣는다(시각 = 타임라인 초).
import { fontStyle } from "../fonts.mjs";

export default ({ shot, shotIndex, brand, W, H, us }) => {
  const P = shot.props;
  const portrait = H > W;
  const fontSize = Math.round((portrait ? W : H) * (portrait ? 0.062 : 0.058));
  const boxW = Math.round(W * 0.86), boxH = Math.round(fontSize * 2.8);
  const text = /^["“'‘「]/.test(P.text) ? P.text : `“${P.text}”`;
  const token = brand.fonts?.body ?? brand.fonts?.display;
  const font = token ? fontStyle(typeof token === "string" ? { name: token, weight: 700 } : { ...token, weight: 700 }) : {};
  const id = `keyline_${P.shot ?? shotIndex}`;
  const clip = {
    type: "Text", name: `대사 ${P.shot ?? shotIndex}`, text,
    timing: { display: { from: us(shot.from), to: us(shot.to) }, duration: us(shot.to - shot.from), playbackRate: 1 },
    transform: { x: Math.round((W - boxW) / 2), y: Math.round(H * (portrait ? 0.6 : 0.66)), width: boxW, height: boxH, angle: 0, opacity: 1, zIndex: 30 },
    style: {
      ...font, fontSize, color: P.color ?? "#FFD400", align: "center", verticalAlign: "middle", lineHeight: 1.2,
      wordWrap: true, wordWrapWidth: boxW,
      stroke: { color: "#000000", width: Math.max(2, Math.round(fontSize * 0.08)) },
      autoFit: { mode: "shrink", maxLines: 2, minFontSize: Math.round(fontSize * 0.6), maxFontSize: fontSize },
    },
  };
  return { clips: { [id]: clip }, trackOf: { [id]: "keylines" } };
};
