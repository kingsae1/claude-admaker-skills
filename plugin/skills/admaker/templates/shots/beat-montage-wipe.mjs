// 샷 카드 references/shots/beat-montage-wipe.md 의 참조 구현 (presets/fast-montage.mjs 가 props를 채움)
// 블록 하나 = 바닥 소재 한 컷(FOOTAGE, Ken Burns) + 아래 글자 띠 그라데이션 + 라벨 pill + 제목 두 줄.
// 블록 사이에는 투톤 사선 와이프(18° 띠 2장, 2프레임 차)가 화면을 가로질러 컷을 덮는다.
// 값: 지니TV 모든G 15초 9x16 (앱 v0.12.1 미리보기)에서 옮김. 1080×1920 기준값을 W·H 비율로 늘린다.
import { fontStyle } from "../fonts.mjs";
import { entrance } from "../motion.mjs";

export default ({ shot, brand, W, H, FPS, us }) => {
  const P = shot.props, sx = W / 1080, sy = H / 1920, f = 1 / FPS, i = P.index ?? 0;
  const C = brand.colors ?? {};
  const accent = C.accent ?? "#FF2E63", deep = C.accentDeep ?? "#B0123F";
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const box = (x, y, w, h) => ({ x: Math.round(x * sx), y: Math.round(y * sy), width: Math.round(w * sx), height: Math.round(h * sy), angle: 0 });
  const clips = {}, trackOf = {};
  const add = (id, clip, track) => { clips[id] = clip; trackOf[id] = track; };
  const id = (s) => `mont${i}_${s}`;

  // 글자 띠 그라데이션: 아래 43%만 (소재는 위쪽에서 그대로 보임, Q11)
  add(id("scrim"), {
    type: "Shape", name: `montage-${i}-scrim`, src: "shape", shapeType: "rectangle",
    style: { gradient: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 70%, rgba(0,0,0,0.9) 100%)" }, // fill이 아니라 gradient (fill에 넣으면 검은 면)
    timing: timing(shot.from, shot.to), transform: { ...box(0, 1100, 1080, 820), opacity: 1, zIndex: 15 },
  }, "gfx2");
  // 라벨 pill + 글자: 컷과 함께
  if (P.label) {
    const lab = { ...box(90, 1236, 230, 64), opacity: 1 };
    const pop = () => entrance({ dur: 0.3, y: 20, blur: 6, scale: 0.96 });
    add(id("label_bg"), { type: "Shape", name: `montage-${i}-label-bg`, src: "shape", shapeType: "pill", style: { fill: accent, borderRadius: Math.min(lab.width, lab.height) / 2 },
      timing: timing(shot.from, shot.to), transform: { ...lab, zIndex: 35 }, animations: [pop()] }, "gfx1");
    add(id("label"), { type: "Text", name: `montage-${i}-label`, text: P.label, timing: timing(shot.from, shot.to), transform: { ...lab, zIndex: 40 },
      style: { ...fontStyle(brand.fonts.display), fontSize: Math.round(34 * sx), color: "#FFFFFF", align: "center", verticalAlign: "middle" }, animations: [pop()] }, "copy1");
  }
  // 제목: 컷 4프레임 뒤, 0.4초 easeOutExpo
  if (P.title) add(id("title"), {
    type: "Text", name: `montage-${i}-title`, text: P.title,
    timing: timing(shot.from + 4 * f, shot.to), transform: { ...box(90, 1320, 900, 300), opacity: 1, zIndex: 40 },
    style: { ...fontStyle(brand.fonts.display), fontSize: Math.round(100 * sx), color: C.text ?? "#FFFFFF", align: "left", verticalAlign: "middle" },
    animations: [entrance({ dur: 0.4, y: 50, blur: 6, scale: 0.96 })],
  }, "copy2");
  // 사선 와이프: 컷 5프레임 전에 시작해 0.3초에 화면을 가로지름. 두 번째 색은 2프레임 늦게
  if (P.wipeAt != null) [[deep, 0, 60], [accent, 2, 61]].forEach(([fill, lag, z], k) => {
    const t = P.wipeAt + lag * f;
    add(id(`wipe${k}`), {
      type: "Shape", name: `montage-${i}-wipe-${k}`, src: "shape", shapeType: "rectangle", style: { fill },
      timing: timing(t, t + 0.3), transform: { ...box(90, -340, 900, 2600), angle: 18, opacity: 1, zIndex: z },
      animations: [{ type: "keyframes", options: { duration: us(0.3), delay: 0, easing: "linear" },
        params: { "0%": { x: Math.round(-1700 * sx), easing: "easeInOutCubic" }, "100%": { x: Math.round(1700 * sx) } } }],
    }, `wipe${k + 1}`);
  });
  return { clips, trackOf };
};
