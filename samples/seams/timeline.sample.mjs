// 이음새 샘플
export const SECTIONS = [{ id: "all", from: 0, to: 12.5 }];
export const DROP = null;
export const musicPlacement = () => ({ from: 0, trimFrom: 0 });
export const BIG_HITS = [5.6];
export const CAMERA = {};
const SRC = process.env.FOOTAGE_PREFIX ?? "assets/";
const v = (n, from, to) => ({ src: `${SRC}f${n}.mp4`, type: "Video", from, to, size: [1080, 1920], trimFrom: 0, volume: 0 });
export const FOOTAGE = [
  v(0, 0, 2.0), v(1, 2.0, 4.08), v(2, 3.72, 5.6),
  { src: `${SRC}f2.png`, type: "Image", from: 5.6, to: 6.4, size: [1080, 1920], kenBurns: false },
  v(3, 6.4, 8.0), v(4, 8.0, 9.95), v(0, 9.25, 11.25), v(1, 10.75, 12.5),
];
export const SHOTS = [
  { card: "transition-cut-the-curve", section: "all", from: 1.7, to: 2.4, props: { at: 2.0, from: 0, to: 1, dir: "left" } },
  { card: "transition-whip-pan", section: "all", from: 3.7, to: 4.1, props: { at: 3.9, from: 1, to: 2, dir: "left" } },
  { card: "transition-beat-freeze", section: "all", from: 5.6, to: 6.4, props: { at: 5.6, cut: 6.4, still: 3, color: "#FFD43B" } },
  { card: "transition-scribble-cover", section: "all", from: 7.6, to: 8.4, props: { at: 8.0, color: "#FF3B5C" } },
  { card: "transition-shader", section: "all", from: 9.25, to: 9.95, props: { at: 9.6, from: 5, to: 6, key: "am-zoom-blur", values: { push: 1 } } },
  { card: "transition-shader", section: "all", from: 10.75, to: 11.25, props: { at: 11.0, from: 6, to: 7, key: "am-rack-focus" } },
];
export const SEAMS = [
  { at: 2.0, technique: "cut-the-curve LEFT", exit: { clip: "footage_0", axis: "x", dir: -1 }, entry: { clip: "footage_1", axis: "x", dir: -1 } },
  { at: 3.9, technique: "whip-pan LEFT", type: "transition", exit: { clip: "footage_1", axis: "x", dir: -1 }, entry: { clip: "footage_2", axis: "x", dir: -1 } },
];
export const DURATION = 12.5;
