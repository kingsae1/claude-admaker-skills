// 3D → 2D 이어 받기: three 씬이 끝낸 2D 원판(반지름 418px, 화면 중앙)과 같은 자리·크기의 엔진 원(Shape)이 이어 받고,
// 박에 맞춰 터지며 네 단계 모양의 평면 아이콘(원·사각·별·링)이 가운데서 튀어나와 2×2로 선다 → 시계 방향으로 두 번 자리 바꿈 → 빠짐.
// 모두 엔진 Shape + gsapTimeline이라 admaker 앱에서 편집 가능한 레이어로 간다.
import { T, text, shape, gsap } from "./_m.mjs";

const PX_PER_UNIT = 1920 / (2 * 12 * Math.tan((15 * Math.PI) / 180)); // morph-shapes.js 카메라와 같은 값
const DISC_R = 1.4 * PX_PER_UNIT;

export default ({ shot, brand, W, H, us }) => {
  const P = shot.props, t = T(us), C = brand.colors, F = brand.fonts, a = shot.from, b = shot.to, clips = {}, trackOf = {};
  const rel = (sec) => +(sec - a).toFixed(3);
  const cx = W / 2, cy = H / 2;
  clips.f_disc = shape({ shape: "circle", x: cx - DISC_R, y: cy - DISC_R, w: DISC_R * 2, h: DISC_R * 2, fill: C.ink, z: 30, timing: t(a, P.pop + 0.5), name: "disc-2d",
    animations: [gsap([
      { to: { scale: 1.07 }, duration: 0.07, ease: "power2.out", position: rel(P.pop) },
      { to: { scale: 0 }, duration: 0.3, ease: "back.in(1.8)" },
    ])] });
  trackOf.f_disc = "disc2d";

  const S = 300, slots = [[350, 770], [730, 770], [730, 1150], [350, 1150]];
  const tiles = [
    { name: "icon-sphere", shape: "circle", fill: C.cobalt },
    { name: "icon-cube", shape: "rectangle", fill: C.lime, style: { borderRadius: 46 } },
    { name: "icon-star", shape: "star", fill: C.coral, style: { sides: 5, innerRadius: 0.5 } },
    { name: "icon-ring", shape: "circle", style: { stroke: { color: C.pink, width: 64 } }, inset: 32 },
  ];
  tiles.forEach((d, i) => {
    const [x0, y0] = slots[i], k = d.inset ?? 0, off = (j) => [slots[(i + j) % 4][0] - x0, slots[(i + j) % 4][1] - y0];
    const tw = [
      { from: { x: cx - x0, y: cy - y0, scale: 0.001, angle: -140 }, to: { x: 0, y: 0, scale: 1, angle: 0 }, duration: 0.55, ease: "back.out(1.7)", position: rel(P.pop + 0.18 + i * 0.07) },
    ];
    [1, 2].forEach((j) => {
      const [dx, dy] = off(j);
      tw.push({ to: { x: dx, y: dy, angle: 90 * j }, duration: 0.42, ease: "expo.inOut", position: rel(P.turn + (j - 1) * 0.5 + i * 0.03) });
    });
    const [ex, ey] = off(2);
    tw.push({ to: { x: ex + (cx - (x0 + ex)) * 0.4, y: ey + (cy - (y0 + ey)) * 0.4, scale: 0, angle: 260 }, duration: 0.32, ease: "back.in(1.6)", position: rel(P.out + i * 0.05) });
    clips[`f_tile${i}`] = shape({ shape: d.shape, x: x0 - S / 2 + k, y: y0 - S / 2 + k, w: S - 2 * k, h: S - 2 * k, fill: d.fill, style: d.style ?? {}, z: 28, timing: t(a, b), name: d.name, animations: [gsap(tw)] });
    trackOf[`f_tile${i}`] = `tile${i}`;
  });

  // 글자: 머리 라벨 · 아래 번호/이름 · 진행 막대(모두 채움)
  const ink = C.ink;
  clips.f_hl = text("MORPH / STUDY", { font: F.label, size: 32, color: ink, x: 70, w: 500, y: 96, h: 60, align: "left", z: 40, timing: t(a, b), name: "head-left", letterSpacing: 6 });
  clips.f_hr = text("3D → 2D", { font: F.label, size: 32, color: ink, x: 510, w: 500, y: 96, h: 60, align: "right", z: 40, timing: t(a, b), name: "head-right", letterSpacing: 6 });
  clips.f_rule = shape({ x: 70, y: 172, w: 940, h: 4, fill: ink, z: 40, timing: t(a, b), name: "head-rule" });
  trackOf.f_hl = "headL"; trackOf.f_hr = "headR"; trackOf.f_rule = "headRule";
  const by = 1500, at = P.pop + 0.15;
  const rise = (pos) => gsap([{ from: { y: 60 }, to: { y: 0 }, duration: 0.45, ease: "expo.out", position: pos }]);
  const wp = { type: "wipe", options: { duration: us(0.3), delay: 0, easing: "easeOutExpo" }, params: { direction: "up" } };
  clips.f_no = text("06", { font: F.display, size: 132, color: ink, x: 70, w: 300, y: by, h: 170, align: "left", z: 40, timing: t(at, b), name: "no-06", letterSpacing: -4, animations: [wp, rise(0)] });
  clips.f_kr = text("2D 레이어", { font: F.kr, size: 72, color: ink, x: 400, w: 610, y: by + 8, h: 90, align: "right", z: 40, timing: t(at, b), name: "kr-06", animations: [wp, rise(0.05)] });
  clips.f_en = text("EDITABLE SHAPES", { font: F.label, size: 34, color: ink, x: 400, w: 610, y: by + 100, h: 50, align: "right", z: 40, timing: t(at, b), name: "en-06", letterSpacing: 4,
    animations: [gsap([{ from: { opacity: 0, x: 40 }, to: { opacity: 1, x: 0 }, duration: 0.4, ease: "expo.out", position: 0.1 }])] });
  trackOf.f_no = "stageNo"; trackOf.f_kr = "stageKr"; trackOf.f_en = "stageEn";
  for (let k = 0; k < 5; k++) {
    clips[`f_bar${k}`] = shape({ x: 70 + k * 192, y: 1760, w: 172, h: 10, fill: ink, z: 40, timing: t(a, b), name: `bar-${k}`, style: { borderRadius: 5 } });
    trackOf[`f_bar${k}`] = `bar${k}`;
  }
  return { clips, trackOf };
};
