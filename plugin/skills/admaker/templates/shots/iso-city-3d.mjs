// 샷 카드 references/shots/iso-build-up.md (입체형) 의 참조 구현: three 커스텀 씬 "iso-city"(scenes/iso-city.js).
// props: iso-city-flat 과 같은 boxes 형식 + { at, dur, box, palette?, ground?, orbit?: 도, zoom?, stagger?, rise?, title? }
import { adapterShot } from "./_adapter-shot.mjs";

export default (ctx) => {
  const P = ctx.shot.props;
  return adapterShot(ctx, { prefix: "iso3d", adapter: "three", box: [0, 380, 1080, 1180],
    params: { scene: "iso-city", boxes: P.boxes, ...(P.palette ? { palette: P.palette.map((c) => (Array.isArray(c) ? c[0] : c)) } : {}),
      ground: P.ground ?? "#A9E3C6", orbit: P.orbit ?? 18, zoom: P.zoom ?? 1, stagger: P.stagger ?? 0.07, rise: P.rise ?? 0.45, start: 0.25 } });
};
