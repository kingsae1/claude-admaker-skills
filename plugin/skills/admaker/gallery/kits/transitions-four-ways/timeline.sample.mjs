// 전환 샘플 timeline.mjs: 템플릿 timeline.mjs의 "섹션:" 이하를 이 내용으로 바꿔 씁니다.
// 바닥 소재 5컷(assets/f0–f4.mp4, 마지막 컷은 f0 재사용), 전환 샷 5종. 렌더 하니스에서는 FOOTAGE_PREFIX=/ 로 render/ 안의 파일을 씁니다.
// 전환 샘플: 소재 5컷, 전환 4종
export const SECTIONS = [{ id: "all", from: 0, to: 9 }];
export const DROP = null;
export const musicPlacement = () => ({ from: 0, trimFrom: 0 });
export const BIG_HITS = [];
export const CAMERA = {};
const SRC = process.env.FOOTAGE_PREFIX ?? "assets/";
const v = (n, from, to) => ({ src: `${SRC}f${n}.mp4`, type: "Video", from, to, size: [1080, 1920], trimFrom: 0, volume: 0 });
export const FOOTAGE = [v(0, 0, 2.0), v(1, 2.0, 4.0), v(2, 3.3, 5.6), v(3, 5.6, 8.0), v(4, 7.0, 9.5), v(0, 9.5, 11)];
export const SHOTS = [
  { card: "transition-cover-flood", section: "t", from: 1.6, to: 2.4, props: { at: 2.0, origin: [540, 1500], to: [540, 820] } },
  { card: "transition-zoom-through", section: "t", from: 3.3, to: 4.0, props: { at: 4.0, dur: 0.7, portal: { x: 540, y: 820, d: 420 }, from: 1, to: 2, ring: "#FFFFFF" } },
  { card: "transition-match-cut", section: "t", from: 5.2, to: 6.2, props: { at: 5.6, from: 2, to: 3, push: { dx: -90 }, carry: { a: { x: 330, y: 1250, d: 260 }, b: { x: 700, y: 700, d: 520 }, color: "#FFFFFF" } } },
  { card: "transition-flash-streak", section: "t", from: 9.2, to: 9.7, props: { at: 9.5, color: "#FF2E63" } },
  { card: "transition-footage-card", section: "t", from: 7.0, to: 8.0, props: { at: 7.0, dur: 1.0, from: 3, to: 4 } },
];
export const DURATION = 11;
