// 모션 스타일 샘플 timeline.mjs: 소재 6컷 위에 모션 6종 (키네틱 타이포, 스쿼시 앤 스트레치, 아이소메트릭 평면·입체, 리퀴드, 파티클 로고)
// 렌더 하니스에서는 FOOTAGE_PREFIX=/ 로 render/ 안의 자리표시 영상을 씁니다.
import { gridFromAnalysis } from "./beats.mjs";
export const FPS = 30;
export const BPM = 120;
export const GRID = gridFromAnalysis({ beatSec: 60 / BPM, firstBeatSec: 0 }, { fps: FPS });
export const us = (sec) => Math.round(sec * 1e6);
export const SECTIONS = [{ id: "all", from: 0, to: 21 }];
export const DROP = null;
export const musicPlacement = () => ({ from: 0, trimFrom: 0 });
export const BIG_HITS = [];
export const CAMERA = {};
const SRC = process.env.FOOTAGE_PREFIX ?? "assets/";
const v = (n, from, to) => ({ src: `${SRC}f${n}.mp4`, type: "Video", from, to, size: [1080, 1920], trimFrom: 0, volume: 0 });
const L = 3.5;
export const FOOTAGE = [0, 1, 2, 3, 4, 5].map((i) => v(i, i * L, (i + 1) * L));
// 아이소 도시 배치 (격자 칸 x, y · 높이 h 칸 · 색 c). 평면·입체가 같은 배치를 씀
const CITY = [
  { x: 0, y: 0, h: 2.5, c: 2 }, { x: 1, y: 0, h: 1.5, c: 0 }, { x: 2, y: 0, h: 3.0, c: 1 }, { x: 3, y: 0, h: 1.0, c: 3 },
  { x: 0, y: 1, h: 1.2, c: 1 }, { x: 1, y: 1, h: 3.5, c: 2 }, { x: 3, y: 1, h: 2.0, c: 0 },
  { x: 0, y: 2, h: 2.0, c: 0 }, { x: 2, y: 2, h: 2.5, c: 2 }, { x: 3, y: 2, h: 1.5, c: 1 },
  { x: 0, y: 3, h: 1.0, c: 3 }, { x: 1, y: 3, h: 2.0, c: 1 }, { x: 2, y: 3, h: 1.2, c: 0 }, { x: 3, y: 3, h: 2.5, c: 2 },
];
const label = (i, text) => ({ card: "sample-label", section: "all", from: i * L, to: (i + 1) * L, props: { text } });
export const SHOTS = [
  label(0, "① 키네틱 타이포"),
  { card: "kinetic-typo-beat", section: "all", from: 0, to: L, props: { at: 0.25, beat: 0.5, words: ["SEE IT", "LOVE IT", "OWN IT"], accent: 1, hold: 2 } },
  label(1, "② 스쿼시 앤 스트레치"),
  { card: "squash-bounce", section: "all", from: L, to: 2 * L, props: { at: L, dur: L, label: "LOADING" } },
  label(2, "③ 아이소메트릭 (평면)"),
  { card: "iso-city-flat", section: "all", from: 2 * L, to: 3 * L, props: { at: 2 * L, dur: L, boxes: CITY, ground: "#A9E3C6", tile: 100, cy: 1080 } },
  label(3, "④ 아이소메트릭 (입체)"),
  { card: "iso-city-3d", section: "all", from: 3 * L, to: 4 * L, props: { at: 3 * L, dur: L, boxes: CITY, orbit: 40 } },
  label(4, "⑤ 리퀴드 모션"),
  { card: "liquid-blobs", section: "all", from: 4 * L, to: 5 * L, props: { at: 4 * L, dur: L, title: "STAY CURIOUS", titleY: 1480 } },
  label(5, "⑥ 파티클 로고"),
  { card: "particle-logo", section: "all", from: 5 * L, to: 6 * L, props: { at: 5 * L, dur: L, text: "CREATE", gather: [0.3, 2.0] } },
];
export const DURATION = 6 * L;
