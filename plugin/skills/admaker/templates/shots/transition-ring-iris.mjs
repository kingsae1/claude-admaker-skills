// 샷 카드 references/shots/transition-ring-iris.md 의 참조 구현 (엔진 3.0.25+: pie + paint startAngle·endAngle).
// 동심원 링 호가 시계처럼 돌며 차례로 차올라 화면을 덮고(바깥 → 안, 링마다 방향을 바꿈), 컷 뒤에는 같은 링이
// 반대로 쓸려 나가며 다음 장면을 연다. 주인공 쪽 origin에서 열리면 그 자리로 눈이 간다.
// props: { at: 컷 초, origin: [x, y] (1080×1920 기준, 기본 화면 가운데), rings: 6, colors: [링 색…],
//          grow: 0.4, shrink: 0.42, intensity?: interludes.mjs INTENSITY 값 (느린 템포는 durScale 1.6으로 0.9–1.2초) }
import { farCorner } from "../motion.mjs";

const pct = (t, L) => `${Math.max(0, Math.min(100, (t / L) * 100)).toFixed(3)}%`;

export default ({ shot, brand, W, H, FPS, us }) => {
  const P = shot.props, f = 1 / FPS, sx = W / 1080, sy = H / 1920;
  const I = P.intensity ?? {};
  const k = I.durScale ?? 1;
  const grow = (P.grow ?? 0.4) * k, shrink = (P.shrink ?? 0.42) * k;
  const n = P.rings ?? 6;
  const bc = brand.colors ?? {};
  const colors = P.colors ?? [bc.accent ?? "#FF4A1C", bc.text ?? "#F5F5F7", bc.background ?? "#141414"];
  const o = P.origin ? [P.origin[0] * sx, P.origin[1] * sy] : [W / 2, H / 2];
  const R = farCorner(o, W, H) + 6, band = R / n;
  const easeIn = I.easeIn ?? "easeInCubic", easeOut = "easeOutQuad"; // 여는 쪽 끝이 너무 느리면 가는 조각이 남아 튀어 보임
  const t0 = P.at - f - grow, L = grow + 2 * f + shrink;
  const timing = { display: { from: us(t0), to: us(t0 + L) }, duration: us(L), playbackRate: 1 };
  const id = (s) => `ringiris${P.index ?? 0}_${s}`;
  const clips = {};
  for (let i = 0; i < n; i++) {
    const r = (i + 1) * band + 1; // 1px 겹쳐 링 사이 틈을 막음
    const inner = i === 0 ? 0 : Math.max(0, (i * band - 1) / r);
    const cw = i % 2 === 0; // 짝수 링은 시계방향, 홀수는 반시계
    const outer = (n - 1 - i) / Math.max(1, n - 1); // 바깥 링부터 0
    const inStart = outer * grow * 0.45, inEnd = grow;
    const outStart = grow + 2 * f + (1 - outer) * shrink * 0.35, outEnd = grow + 2 * f + shrink;
    const sweepIn = cw ? { a: { startAngle: 0, endAngle: 0 }, b: { startAngle: 0, endAngle: 360 } } : { a: { startAngle: 360, endAngle: 360 }, b: { startAngle: 0, endAngle: 360 } };
    const sweepOut = cw ? { startAngle: 360, endAngle: 360 } : { startAngle: 0, endAngle: 0 };
    const spin = (cw ? 1 : -1) * 40;
    clips[id(`r${i}`)] = { type: "Shape", name: "ring-iris ring", src: "shape", shapeType: "pie",
      style: { fill: colors[i % colors.length], startAngle: 0, endAngle: 0, innerRadius: inner },
      timing, transform: { x: Math.round(o[0] - r), y: Math.round(o[1] - r), width: Math.round(2 * r), height: Math.round(2 * r), angle: 0, opacity: 1, zIndex: 72 - i * 0 },
      animations: [
        { type: "paint", options: { duration: us(L), delay: 0, easing: "linear" }, params: {
          "0%": { ...sweepIn.a }, [pct(inStart, L)]: { ...sweepIn.a, easing: easeIn }, [pct(inEnd, L)]: { ...sweepIn.b },
          [pct(outStart, L)]: { ...sweepIn.b, easing: easeOut }, [pct(outEnd, L)]: { ...sweepOut }, "100%": { ...sweepOut } } },
        // 링이 차오르는 동안 살짝 같이 돌아 속도감이 남
        { type: "keyframes", options: { duration: us(L), delay: 0, easing: "linear" }, params: {
          "0%": { angle: -spin, easing: "easeOutCubic" }, [pct(grow, L)]: { angle: 0 }, [pct(grow + 2 * f, L)]: { angle: 0, easing: "easeInCubic" }, "100%": { angle: spin } } },
      ] };
  }
  clips[id("hold")] = { type: "Shape", name: "ring-iris hold", src: "shape", shapeType: "rectangle", style: { fill: colors[(n - 1) % colors.length] },
    timing: { display: { from: us(P.at - f), to: us(P.at + f) }, duration: us(2 * f), playbackRate: 1 },
    transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1, zIndex: 71 } };
  return { clips, trackOf: Object.fromEntries(Object.keys(clips).map((k2) => [k2, "trans1"])) };
};
