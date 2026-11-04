// 샷 카드 references/shots/liquid-blobs.md 의 참조 구현: three 커스텀 씬 "liquid-blobs"(scenes/liquid-blobs.js) + 문구.
// props: { at, dur, box: [x, y, w, h] (1080×1920 기준), color, count, seed, intro, speed, title?, titleY?, titleAt? }
import { adapterShot } from "./_adapter-shot.mjs";

export default (ctx) => {
  const P = ctx.shot.props;
  return adapterShot(ctx, { prefix: "liquid", adapter: "three", box: [0, 260, 1080, 1180],
    params: { scene: "liquid-blobs", color: P.color ?? ctx.brand.colors?.accent ?? "#1F5BFF", count: P.count ?? 6, seed: P.seed ?? 3, intro: P.intro ?? 0.6, speed: P.speed ?? 1, spread: P.spread ?? 0.75 } });
};
