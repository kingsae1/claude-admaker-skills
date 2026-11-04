// 샷 카드 references/shots/squash-bounce.md 의 참조 구현.
// 공(원 Shape) 몇 개가 위에서 떨어져 바닥에서 납작해지고(squash) 늘어나며(stretch) 튀어 오른다. 공마다 위상이 달라 물결처럼.
// 바닥 그림자 타원은 공이 높을수록 작고 옅어진다. 마지막 착지에서 출렁이며 멈추고, 아래 글자가 통통 튀며 나온다.
// props: { at, dur: 샷 길이(초), balls: 개수(기본 3), d: 공 지름 px, ground: 바닥 y, height: 튀는 높이 px, period: 한 번 튀는 시간(초),
//          spread: 공 간격 px, color, label?: 아래 글자, labelSize }
// 엔진 scale은 클립 중심 기준이라, 납작해질 때 y를 반지름×(1−scaleY)만큼 내려 바닥에 붙인다. JSON만 씀 → 앱까지 감.
import { fontStyle } from "../fonts.mjs";

export default ({ shot, shotIndex = 0, brand, W, H, FPS, us }) => {
  const P = shot.props, sx = W / 1080, sy = H / 1920, f = 1 / FPS;
  const n = P.balls ?? 3, d = (P.d ?? 120) * sx, r = d / 2, ground = (P.ground ?? 1120) * sy;
  const hgt = (P.height ?? 420) * sy, T = P.period ?? 0.62, spread = (P.spread ?? 210) * sx;
  const dur = P.dur ?? 3.5, color = P.color ?? brand.colors?.accent ?? "#1F5BFF";
  const settleAt = dur - 1.0;              // 이 시각 이후 첫 착지에서 멈춤
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const id = (s) => `squash${shotIndex}_${s}`;
  const clips = {}, trackOf = {};
  const SQ = { scaleX: 1.38, scaleY: 0.6 }, ST = { scaleX: 0.86, scaleY: 1.18 };

  for (let i = 0; i < n; i++) {
    const cx = W / 2 + (i - (n - 1) / 2) * spread;
    const start = (i * T) / n;             // 위상차
    const ball = [], shade = [];
    // 첫 낙하: 화면 위에서 늘어난 채로
    ball.push({ from: { y: -hgt * 2.2, opacity: 0, ...ST }, to: { y: 0, opacity: 1, ...ST }, duration: 0.42, ease: "power2.in", position: start });
    shade.push({ from: { scaleX: 0.3, opacity: 0 }, to: { scaleX: 1, opacity: 1 }, duration: 0.42, ease: "power2.in", position: start });
    let c = start + 0.42, last = false;
    while (!last) {
      last = c >= settleAt;
      // 착지: 납작 (바닥에 붙게 y 보정)
      ball.push({ to: { ...SQ, y: r * (1 - SQ.scaleY) }, duration: 0.05, ease: "power2.out", position: c });
      shade.push({ to: { scaleX: 1.25 }, duration: 0.05, ease: "power2.out", position: c });
      if (last) {
        ball.push({ to: { scaleX: 1, scaleY: 1, y: 0 }, duration: 0.5, ease: "elastic.out(1,0.35)" });
        shade.push({ to: { scaleX: 1 }, duration: 0.5, ease: "elastic.out(1,0.35)" });
        break;
      }
      // 튀어 오름: 늘어났다가 꼭대기에서 동그랗게
      ball.push({ to: { ...ST, y: -r * 0.5 }, duration: 0.05, ease: "power2.out" });
      ball.push({ to: { scaleX: 1, scaleY: 1, y: -hgt }, duration: T / 2 - 0.05, ease: "power2.out" });
      ball.push({ to: { ...ST, y: 0 }, duration: T / 2 - 0.05, ease: "power2.in" });
      shade.push({ to: { scaleX: 0.45, opacity: 0.4 }, duration: T / 2, ease: "power2.out", position: c + 0.05 });
      shade.push({ to: { scaleX: 1, opacity: 1 }, duration: T / 2 - 0.05, ease: "power2.in" });
      c += T;
    }
    clips[id(`ball${i}`)] = { type: "Shape", name: `ball-${i}`, src: "shape", shapeType: "circle", style: { fill: color },
      timing: timing(P.at, P.at + dur), transform: { x: Math.round(cx - r), y: Math.round(ground - d), width: Math.round(d), height: Math.round(d), angle: 0, opacity: 1, zIndex: 40 + i },
      animations: [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens: ball } }] };
    clips[id(`shade${i}`)] = { type: "Shape", name: `ball-shadow-${i}`, src: "shape", shapeType: "ellipse", style: { fill: "#000000" },
      timing: timing(P.at, P.at + dur), transform: { x: Math.round(cx - r * 0.9), y: Math.round(ground - 8 * sy), width: Math.round(r * 1.8), height: Math.round(22 * sy), angle: 0, opacity: 0.45, zIndex: 30 },
      animations: [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens: shade } }] };
    trackOf[id(`ball${i}`)] = "squash";
    trackOf[id(`shade${i}`)] = "squashShadow";
  }
  if (P.label) {
    const size = Math.round((P.labelSize ?? 64) * sx), from = P.at + settleAt + 0.25;
    clips[id("label")] = { type: "Text", name: "squash-label", text: P.label,
      timing: timing(from, P.at + dur), transform: { x: 0, y: Math.round(ground + 90 * sy), width: W, height: Math.round(size * 1.4), angle: 0, opacity: 1, zIndex: 45 },
      style: { ...fontStyle(brand.fonts?.display ?? { name: "Pretendard", weight: 900 }), fontSize: size, color: brand.colors?.text ?? "#FFFFFF", align: "center", verticalAlign: "center", letterSpacing: 6,
        shadow: { color: "#000000", alpha: 0.45, blur: 10, offsetX: 0, offsetY: 3 },
        characterAnimation: [{ type: "bouncy_in", duration: 0.45, stagger: 0.05, staggerMode: "char" }] } };
    trackOf[id("label")] = "squashLabel";
  }
  return { clips, trackOf };
};
