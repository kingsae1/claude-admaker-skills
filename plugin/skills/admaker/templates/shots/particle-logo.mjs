// 샷 카드 references/shots/particle-logo.md 의 참조 구현: script 어댑터 "particle-logo"(scripts/particle-logo.js).
// props: { at, dur, text | image, box, size, color, color2, count, step, dot, seed, gather: [시작, 끝] 초, swirl, title? }
// 글자는 브랜드 display 폰트로 샘플링한다(fontUrl을 같이 넘겨 스크립트가 직접 불러옴).
import { adapterShot } from "./_adapter-shot.mjs";
import { fontStyle } from "../fonts.mjs";

export default (ctx) => {
  const P = ctx.shot.props;
  const f = fontStyle(ctx.brand.fonts?.display ?? { name: "Pretendard", weight: 900 });
  return adapterShot(ctx, { prefix: "particle", adapter: "script", box: [0, 260, 1080, 1400],
    params: { name: "particle-logo", ...(P.image ? { image: P.image } : { text: P.text ?? "CREATE", font: f.fontFamily, weight: f.fontWeight ?? 400, fontUrl: P.fontUrl ?? f.fontUrl }),
      size: P.size ?? 230, color: P.color ?? ctx.brand.colors?.accent2 ?? "#A9C4FF", color2: P.color2 ?? "#FFFFFF",
      count: P.count ?? 1600, step: P.step ?? 5, dot: P.dot ?? 4, seed: P.seed ?? 11, gather: P.gather ?? [0.4, 1.9], swirl: P.swirl ?? 1.2 } });
};
