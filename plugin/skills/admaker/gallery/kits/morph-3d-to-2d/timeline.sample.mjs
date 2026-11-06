// 3D 모프 샘플 (13.5초, 9:16, 모션그래픽만). 하나의 3D 메시가 구 → 큐브 → 별 → 도넛으로 변신하고, 납작해져 2D 링 → 2D 원이 된 뒤
// 엔진 2D 도형(편집 가능한 Shape)으로 이어져 네 모양의 평면 아이콘으로 흩어지고 엔드카드로 끝난다.
import { gridFromAnalysis } from "./beats.mjs";
export const FPS = 30;
export const BPM = 120;
export const GRID = gridFromAnalysis({ beatSec: 60 / BPM, firstBeatSec: 0 }, { fps: FPS });
export const BEAT = GRID.beatSec;
export const beat = (n) => GRID.at(n);
export const us = (sec) => Math.round(sec * 1e6);

// 변신 [시작, 길이] (초). 3D 클립이 0초에 시작하므로 씬 안 시간 = 광고 시간
export const MORPHS = [[beat(4), 0.55], [beat(8), 0.55], [beat(12), 0.55], [beat(16), 0.8], [beat(18), 0.4]];
export const HANDOFF = beat(18.8); // 2D 원판이 다 닫힌 직후 → 엔진 2D 원이 이어 받음
export const SECTIONS = [
  { id: "morph",  from: 0,           to: beat(19) }, // 0–9.5s   3D 변신 + 평면화
  { id: "flat2d", from: beat(18.8),  to: beat(23) }, // 9.4–11.5s 2D 아이콘으로 흩어짐
  { id: "end",    from: beat(23),    to: beat(27) }, // 11.5–13.5s 엔드카드
];
export const CAMERA = {};
export const FOOTAGE = []; // 샘플: 모션그래픽만
const C = { paper: "#EFEBE4", ink: "#121212", cobalt: "#2B45FF", lime: "#D4FF3A", coral: "#FF5233", pink: "#FF9BD6" };
export const STAGES = [
  { from: 0,        bg: C.paper,  ink: C.ink,   word: "ROUND", wordColor: C.ink,   no: "01", kr: "구",    en: "SPHERE · 3D", obj: C.cobalt },
  { from: beat(4),  bg: C.cobalt, ink: C.paper, word: "BLOCK", wordColor: C.paper, no: "02", kr: "큐브",  en: "CUBE · 3D",   obj: C.lime, wipe: "up" },
  { from: beat(8),  bg: C.lime,   ink: C.ink,   word: "BLOOM", wordColor: C.ink,   no: "03", kr: "별",    en: "STAR · 3D",   obj: C.coral, wipe: "left" },
  { from: beat(12), bg: C.ink,    ink: C.paper, word: "LOOP",  wordColor: C.paper, no: "04", kr: "도넛",  en: "TORUS · 3D",  obj: C.pink, wipe: "down" },
  { from: beat(16), bg: C.paper,  ink: C.ink,   word: "FLAT",  wordColor: C.cobalt, no: "05", kr: "평면", en: "RING → DISC · 2D", obj: C.ink, wipe: "right" },
];
export const SHOTS = [
  { card: "m-bg", section: "morph", from: 0, to: beat(27), props: { scenes: [
    ...STAGES.map((s, i) => ({ from: s.from + (i ? 0.1 : 0), to: STAGES[i + 1]?.from ?? beat(23), color: s.bg, wipe: s.wipe && { dir: s.wipe, dur: 0.4 } })),
    { from: beat(23), to: beat(27), color: C.ink, wipe: { dir: "up", dur: 0.35 } },
  ] } },
  { card: "m-morph", section: "morph", from: 0, to: beat(19), props: { stages: STAGES, morphs: MORPHS, end: beat(19), handoff: HANDOFF, wordEnd: beat(23) } },
  { card: "m-flat2d", section: "flat2d", from: HANDOFF, to: beat(23), props: { pop: beat(19), turn: beat(21), out: beat(22.5) } },
  { card: "m-end", section: "end", from: beat(23), to: beat(27), props: { word: "MORPH", sub: "FROM 3D TO 2D", kr: "모양이 바뀌면, 이야기가 바뀐다" } },
];
export const DURATION = SECTIONS.at(-1).to;
