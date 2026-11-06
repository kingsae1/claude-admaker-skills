// 엔드카드: 검정 배경 위 큰 워드마크(글자마다 솟음) + 네 모양 미니 아이콘이 박에 튀어나옴 + 영문 부제 + 한글 한 줄.
import { T, text, shape, gsap, wipe } from "./_m.mjs";
export default ({ shot, brand, W, us }) => {
  const P = shot.props, t = T(us), C = brand.colors, F = brand.fonts, a = shot.from, b = shot.to, clips = {}, trackOf = {};
  clips.e_word = text(P.word, { font: F.display, size: 200, color: C.paper, y: 680, h: 260, z: 40, timing: t(a + 0.2, b), name: "wordmark", letterSpacing: -6,
    extra: { characterAnimation: [{ type: "rise", duration: 0.55, stagger: 0.05, staggerMode: "char", easing: "expo.out" }] } });
  trackOf.e_word = "endWord";
  const icons = [
    { shape: "circle", fill: C.cobalt }, { shape: "rectangle", fill: C.lime, style: { borderRadius: 20 } },
    { shape: "star", fill: C.coral, style: { sides: 5, innerRadius: 0.5 } }, { shape: "circle", style: { stroke: { color: C.pink, width: 26 } }, inset: 13 },
  ];
  const s = 110, gap = 44, x0 = (W - (4 * s + 3 * gap)) / 2;
  icons.forEach((d, i) => {
    const k = d.inset ?? 0;
    clips[`e_icon${i}`] = shape({ shape: d.shape, x: x0 + i * (s + gap) + k, y: 1000 + k, w: s - 2 * k, h: s - 2 * k, fill: d.fill, style: d.style ?? {}, z: 40, timing: t(a + 0.55, b), name: `end-icon-${i}`,
      animations: [gsap([{ from: { scale: 0, angle: -90, y: 40 }, to: { scale: 1, angle: 0, y: 0 }, duration: 0.5, ease: "back.out(2)", position: i * 0.08 },
        { to: { y: -18 }, duration: 0.18, ease: "power2.out", position: 1.0 + i * 0.06 }, { to: { y: 0 }, duration: 0.3, ease: "bounce.out" }])] });
    trackOf[`e_icon${i}`] = `endIcon${i}`;
  });
  clips.e_sub = text(P.sub, { font: F.label, size: 40, color: C.paper, y: 1210, h: 60, z: 40, timing: t(a + 0.85, b), name: "end-sub", letterSpacing: 12,
    animations: [gsap([{ from: { opacity: 0, y: 24 }, to: { opacity: 1, y: 0 }, duration: 0.45, ease: "expo.out", position: 0 }])] });
  clips.e_kr = text(P.kr, { font: F.kr, size: 58, color: C.lime, y: 1310, h: 80, z: 40, timing: t(a + 1.0, b), name: "end-kr",
    animations: [wipe(us, 0.45, "right", "easeInOutExpo")] });
  trackOf.e_sub = "endSub"; trackOf.e_kr = "endKr";
  clips.e_hl = text("MORPH / STUDY", { font: F.label, size: 32, color: C.paper, x: 70, w: 500, y: 96, h: 60, align: "left", z: 40, timing: t(a + 0.2, b), name: "head-left", letterSpacing: 6 });
  clips.e_hr = text("3D → 2D", { font: F.label, size: 32, color: C.paper, x: 510, w: 500, y: 96, h: 60, align: "right", z: 40, timing: t(a + 0.2, b), name: "head-right", letterSpacing: 6 });
  clips.e_rule = shape({ x: 70, y: 172, w: 940, h: 4, fill: C.paper, z: 40, timing: t(a + 0.2, b), name: "head-rule" });
  trackOf.e_hl = "headL"; trackOf.e_hr = "headR"; trackOf.e_rule = "headRule";
  return { clips, trackOf };
};
