// 샷 카드 references/shots/kinetic-typo-beat.md 의 참조 구현.
// 짧은 단어 줄 2–4개가 박마다 하나씩 꽂히고(슬램), 강조 줄 뒤로 색 띠가 와이프로 깔리고, 이미 나온 줄은 다음 박에 작게 펀치.
// 마지막 박에 전체가 한 번 눌렸다 펴지고, 퇴장은 줄마다 2프레임 차이로 위로 빠짐.
// props: { at: 시작 초, beat: 박 길이(초), words: ["SEE IT", "LOVE IT", "OWN IT"], accent: 강조 줄 번호(없으면 -1),
//          y: 첫 줄 중심 y, gap: 줄 간격 px, size: 글자 px, hold: 다 나온 뒤 머무는 박 수(기본 3), color, barColor, onBar: 띠 위 글자색 }
// JSON만 씀(gsapTimeline + wipe) → 앱 불러오기까지 그대로 감.
import { fontStyle } from "../fonts.mjs";

export default ({ shot, shotIndex = 0, brand, W, H, FPS, us }) => {
  const P = shot.props, sx = W / 1080, sy = H / 1920, f = 1 / FPS;
  const beat = P.beat ?? 0.5, words = P.words ?? ["SEE IT", "LOVE IT", "OWN IT"];
  const size = Math.round((P.size ?? 150) * sx), gap = (P.gap ?? 190) * sy, y0 = (P.y ?? 760) * sy;
  const color = P.color ?? brand.colors?.text ?? "#FFFFFF";
  const bar = P.barColor ?? brand.colors?.accent ?? "#1F5BFF", onBar = P.onBar ?? "#FFFFFF";
  const font = fontStyle(brand.fonts?.display ?? { name: "Pretendard", weight: 900 });
  const n = words.length, hold = P.hold ?? 3;
  const tEnd = (n + hold) * beat;            // 퇴장 시작 (클립 기준)
  const dur = tEnd + 0.35 + 2 * f * n;
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const id = (s) => `typo${shotIndex}_${s}`;
  const clips = {}, trackOf = {};
  const shadow = { color: "#000000", alpha: 0.45, blur: 10, offsetX: 0, offsetY: 3 };

  words.forEach((word, i) => {
    const t = i * beat, cy = y0 + i * gap, h = Math.round(size * 1.25);
    const isAccent = i === P.accent;
    // 강조 줄의 띠: 박에 맞춰 왼쪽에서 와이프 (마스크는 delay 전에 안 걸리므로 클립을 그 박에 시작)
    if (isAccent) {
      clips[id(`bar${i}`)] = { type: "Shape", name: `typo-bar-${i}`, src: "shape", shapeType: "rectangle", style: { fill: bar },
        timing: timing(P.at + t, P.at + dur), transform: { x: 0, y: Math.round(cy - h * 0.62), width: W, height: Math.round(h * 1.24), angle: 0, opacity: 1, zIndex: 30 },
        animations: [
          { type: "wipe", options: { duration: us(0.22), delay: 0, easing: "easeOutQuart" }, params: { direction: "right" } },
          { type: "gsapTimeline", options: { delay: 0 }, params: { tweens: [
            { to: { scaleY: 0 }, duration: 0.25, ease: "power3.in", position: tEnd - t + f * i * 2 },
          ] } },
        ] };
      trackOf[id(`bar${i}`)] = "typoBar";
    }
    // 박에 슬램: 크게(1.7) 흐리게 → 1로 0.16초, 이어서 살짝 눌림(scaleY 0.92)·복귀
    const later = [];
    for (let k = i + 1; k < n; k++) later.push(
      { to: { scale: 1.06 }, duration: 0.06, ease: "power2.out", position: k * beat },
      { to: { scale: 1 }, duration: 0.2, ease: "power2.inOut" },
    );
    clips[id(`w${i}`)] = { type: "Text", name: `typo-${i}`, text: word,
      timing: timing(P.at, P.at + dur), transform: { x: 0, y: Math.round(cy - h / 2), width: W, height: h, angle: 0, opacity: 1, zIndex: 40 + i },
      style: { ...font, fontSize: size, color: isAccent ? onBar : color, align: "center", verticalAlign: "center", letterSpacing: 2, ...(isAccent ? {} : { shadow }) },
      animations: [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens: [
        { from: { scale: 1.7, opacity: 0, blur: 10 }, to: { scale: 1, opacity: 1, blur: 0 }, duration: 0.16, ease: "power4.out", position: t },
        { to: { scaleX: 1.04, scaleY: 0.9 }, duration: 0.05, ease: "power2.out" },
        { to: { scaleX: 1, scaleY: 1 }, duration: 0.22, ease: "back.out(3)" },
        ...later,
        // 다 나온 다음 박: 전체가 한 번 눌렸다 펴짐 (같은 박에 모든 줄)
        { to: { scaleY: 0.86, scaleX: 1.05 }, duration: 0.06, ease: "power2.out", position: n * beat },
        { to: { scaleY: 1, scaleX: 1 }, duration: 0.3, ease: "elastic.out(1,0.45)" },
        // 퇴장: 위로, 줄마다 2프레임 늦게
        { to: { y: -90 * sy, opacity: 0, blur: 6 }, duration: 0.25, ease: "power3.in", position: tEnd + f * i * 2 },
      ] } }] };
    trackOf[id(`w${i}`)] = "typo";
  });
  return { clips, trackOf };
};
