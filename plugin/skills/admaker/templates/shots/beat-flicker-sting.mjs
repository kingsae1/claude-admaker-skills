// 샷 카드 references/shots/beat-flicker-sting.md 의 참조 구현 (presets/fast-montage.mjs 가 props를 채움)
// 세로 막대 하나가 첫 박에 솟고, 가는 컬러 바가 2프레임씩 깜빡이다가, 워드마크가 박에 슬램. 이어서 카피 스택이 1박 간격으로.
// 값: 지니TV 모든G 15초 9x16 (앱 v0.12.1 미리보기)에서 옮김. 1080×1920 기준값을 W·H 비율로 늘린다.
import { fontStyle } from "../fonts.mjs";
import { entrance, holdFrom } from "../motion.mjs";

// 플리커 패턴: [x, 폭, 불투명도, 색 번호] 쌍 5개 (색 0 = accent, 1 = flicker2, 2 = flicker3, 3 = 흰색)
const PAIRS = [
  [[770, 6, 0.64, 1], [538, 39, 0.89, 1]],
  [[542, 40, 0.84, 2], [385, 43, 0.87, 1]],
  [[288, 38, 0.76, 2], [673, 48, 0.78, 0]],
  [[613, 48, 0.81, 2], [726, 47, 0.7, 1]],
  [[431, 44, 0.68, 0], [418, 25, 0.8, 3]],
];

export default ({ shot, brand, W, H, FPS, us }) => {
  const P = shot.props, sx = W / 1080, sy = H / 1920, f = 1 / FPS;
  const C = brand.colors ?? {};
  const palette = [C.accent ?? "#FF2E63", C.flicker2 ?? "#FF7A45", C.flicker3 ?? "#00C2FF", "#FFFFFF"];
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const bar = (x, w) => ({ x: Math.round(x * sx), y: Math.round(660 * sy), width: Math.max(2, Math.round(w * sx)), height: Math.round(600 * sy), angle: 0 });
  const clips = {}, trackOf = {};
  const add = (id, clip, track) => { clips[id] = clip; trackOf[id] = track; };

  // ① 첫 막대: 박에 솟음 (scaleY 0→1, 0.267초)
  const flickFrom = P.barAt + (P.wordmarkAt - P.barAt) * 0.5;
  add("sting_bar", {
    type: "Shape", name: "sting-bar", src: "shape", shapeType: "rectangle", style: { fill: palette[0] },
    timing: timing(P.barAt, flickFrom), transform: { ...bar(528, 24), opacity: 1, zIndex: 30 },
    animations: [{ type: "keyframes", options: { duration: us(8 * f), delay: 0, easing: "linear" },
      params: { "0%": { scaleY: 0, opacity: 0, easing: "easeOutExpo" }, "100%": { scaleY: 1, opacity: 1 } } }],
  }, "sting1");
  // ② 플리커: 2프레임씩, 워드마크 착지까지 5번
  const step = (P.wordmarkAt - flickFrom) / PAIRS.length;
  PAIRS.forEach((pair, i) => pair.forEach(([x, w, o, c], j) => {
    const t = flickFrom + i * step;
    add(`sting_fl${i}_${j}`, {
      type: "Shape", name: `sting-flicker-${i}-${j}`, src: "shape", shapeType: "rectangle", style: { fill: palette[c] },
      timing: timing(t, t + 2 * f), transform: { ...bar(x, w), opacity: o, zIndex: 30 },
    }, j ? "sting2" : "sting1");
  }));
  // ③ 워드마크 슬램: scale 1.35→1 + blur, 0.3초. 카피가 있으면 0.77초 뒤 0.1초에 빠짐
  const display = fontStyle(brand.fonts.display);
  const wmEnd = P.lines?.length ? Math.min(P.linesAt[0], P.wordmarkAt + 0.867) : shot.to;
  const wmAnims = [{ type: "keyframes", options: { duration: us(0.3), delay: 0, easing: "linear" },
    params: { "0%": { scale: 1.35, blur: 10, opacity: 0, easing: "easeOutExpo" }, "100%": { scale: 1, blur: 0, opacity: 1 } } }];
  if (P.lines?.length) wmAnims.push(holdFrom({ type: "keyframes", options: { duration: us(0.1), delay: 0, easing: "linear" },
    params: { "0%": { opacity: 1, easing: "easeInCubic" }, "100%": { opacity: 0 } } }, wmEnd - P.wordmarkAt - 0.1));
  add("sting_wordmark", {
    type: "Text", name: "wordmark", text: P.wordmark ?? "",
    timing: timing(P.wordmarkAt, wmEnd),
    transform: { x: Math.round(60 * sx), y: Math.round(820 * sy), width: Math.round(960 * sx), height: Math.round(280 * sy), angle: 0, opacity: 1, zIndex: 40 },
    style: { ...display, fontSize: Math.round(210 * sx), color: C.text ?? "#FFFFFF", align: "center", verticalAlign: "middle" },
    animations: wmAnims,
  }, "copy1");
  // ④ 카피 스택: 1박 간격, 왼쪽 정렬, 마지막 줄 강조색
  (P.lines ?? []).forEach((line, i) => {
    const last = i === P.lines.length - 1;
    add(`sting_line${i}`, {
      type: "Text", name: `copy-line-${i}`, text: line,
      timing: timing(P.linesAt[i], shot.to),
      transform: { x: Math.round(90 * sx), y: Math.round((700 + i * 150) * sy), width: Math.round(900 * sx), height: Math.round(140 * sy), angle: 0, opacity: 1, zIndex: 40 },
      style: { ...display, fontSize: Math.round(104 * sx), color: last ? palette[0] : C.text ?? "#FFFFFF", align: "left", verticalAlign: "middle" },
      animations: [entrance({ dur: 0.367, y: 40, blur: 6, scale: 0.96 })],
    }, `copy${(i % 3) + 2}`);
  });
  return { clips, trackOf };
};
