// 단일 진실의 원천: 섹션, 템포, 히트, 카메라, 샷 배치.
// build-project.mjs, sfx, 자막, 검사 스크립트가 모두 이 파일을 읽는다.

import { gridFromAnalysis } from "./beats.mjs";

export const FPS = 30;
// 비트 그리드 (director.md §7): 앱 BGM이면 audio.analyzeBeats 결과를 ANALYSIS에 그대로 붙여 넣는다.
// 없으면 BPM만으로 0초 = 0박. 음악 배치(DROP·trimFrom)를 바꾸면 GRID도 그 값으로 다시 만든다.
export const ANALYSIS = null; // 예: { bpm: 128, beatSec: 0.469, firstBeatSec: 0.21, bars: [...], peaks: [...], sections: [...] }
export const BPM = 120;
export const GRID = gridFromAnalysis(ANALYSIS ?? { beatSec: 60 / BPM, firstBeatSec: 0 }, { fps: FPS });
export const BEAT = GRID.beatSec;             // 초

/** 비트 번호 → 초 (프레임 경계로 스냅). 0박 = 광고 0초 이후 첫 비트 */
export const beat = (n) => GRID.at(n);

// 빠른 몽타주(스팅 → 카피 → N컷 몽타주 → 숫자 슬램 → 엔드카드)는 아래 SECTIONS·SHOTS·FOOTAGE를 손으로 쓰지 않고
// presets/fast-montage.mjs가 박 단위 규칙으로 만든다:
//   import { fastMontage } from "./presets/fast-montage.mjs";
//   const M = fastMontage({ analysis: ANALYSIS, durationSec: 15, content: { … }, music: musicPlacement() });
//   console.log(M.summary, M.warnings);
//   export const { SECTIONS, SHOTS, FOOTAGE, BIG_HITS, DURATION } = M;
/** 초 → μs (엔진 단위) */
export const us = (sec) => Math.round(sec * 1e6);

// 섹션: director.md §4 에너지 골격
export const SECTIONS = [
  { id: "hook",    from: beat(0),  to: beat(3)  },
  { id: "hero",    from: beat(3),  to: beat(9)  },
  { id: "rise",    from: beat(9),  to: beat(22) },
  { id: "endcard", from: beat(22), to: beat(30) },
];

// 드롭 맞추기 (director.md §7.2): 음원 안의 드롭 시각(trackDropSec)이 광고의 핵심 순간(hitSec)에 오게 음악을 배치한다.
// 음악 시작 = hitSec - trackDropSec. 음수면 음원 앞을 잘라 쓴다(trimFrom). 드롭이 없는 광고는 null.
export const DROP = null; // 예: { hitSec: beat(9), trackDropSec: 12.4 }
export const musicPlacement = (drop = DROP) => {
  if (!drop) return { from: 0, trimFrom: 0 };
  const start = drop.hitSec - drop.trackDropSec;
  return start >= 0 ? { from: start, trimFrom: 0 } : { from: 0, trimFrom: -start };
};

// 화면 전체 충격은 3개 이하 (aesthetic-rules R4)
export const BIG_HITS = [beat(1), beat(22)];

// 장면 카메라 키: 엔진에 카메라가 없으므로 build-project가 각 클립에 변환을 계산해 넣는다
export const CAMERA = {
  hero: [
    { t: beat(3), cx: 540, cy: 960, zoom: 0.9 },
    { t: beat(7), cx: 540, cy: 960, zoom: 1.0, easing: "easeInOutQuart" },
  ],
};

// 바닥 소재: 사용자가 준 영상·이미지. 항상 맨 아래(z 2–9)에 프레임 가득 깔리고, 모션 그래픽은 그 위에 얹힌다.
// from/to: 광고 기준 초. size: 원본 픽셀 크기(cover 맞춤 계산용). trimFrom: 영상의 몇 초부터 쓸지. still: 이미지면 Ken Burns.
export const FOOTAGE = [
  { src: "assets/input.mp4", type: "Video", from: 0, to: SECTIONS.at(-1).to, size: [1080, 1920], trimFrom: 0, volume: 0 },
];

// 샷 배치: 샷 카드 이름과 그 샷에 넘길 내용
export const SHOTS = [
  { card: "hook-number-slam",    section: "hook",    from: beat(0),  to: beat(3),  props: { number: "3초", caption: "설명 한 줄" } },
  { card: "hero-tilt-push",      section: "hero",    from: beat(3),  to: beat(9),  props: { image: "assets/hero@2x.png" } },
  { card: "feature-mask-reveal", section: "rise",    from: beat(9),  to: beat(14), props: { image: "assets/f1@2x.png", text: "혜택 하나" } },
  { card: "price-countup",       section: "rise",    from: beat(18), to: beat(22), props: { from: 9000, to: 29900, unit: "원" } },
  { card: "endcard-logo-cta",    section: "endcard", from: beat(22), to: beat(30), props: { logo: "assets/logo.svg", message: "메시지", cta: "지금 시작하기" } },
];

export const DURATION = SECTIONS.at(-1).to;
