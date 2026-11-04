// 앱의 text_segment 렌더러와 같은 경로: 엔진 @admaker/engine/text-segment로 글자별 애니메이션(characterAnimation)을 그린다
import { layoutTextSegment, renderSegmentGlyphsAtTime, drawTextSegmentFrame } from "@admaker/engine/text-segment";
const cache = new Map();
export default function render(ctx, { width, height, time, params }) {
  const key = `${params.text}|${width}x${height}`;
  let layout = cache.get(key);
  if (!layout) { layout = layoutTextSegment({ text: params.text, transform: params.transform, boxWidth: width, boxHeight: height }); cache.set(key, layout); }
  const glyphs = renderSegmentGlyphsAtTime({ text: params.text, transform: params.transform, boxWidth: width, boxHeight: height,
    clipStart: 0, playhead: time, clipDuration: params.duration, layout });
  drawTextSegmentFrame(ctx, { width, height, transform: params.transform, layout, glyphs });
}
export const options = { fps: 30 };
