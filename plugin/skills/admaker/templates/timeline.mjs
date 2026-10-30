// 단일 진실의 원천: 섹션, 템포, 히트, 카메라, 샷 배치.
// build-project.mjs, sfx, 자막, 검사 스크립트가 모두 이 파일을 읽는다.

export const FPS = 30;
export const BPM = 120;
export const BEAT = 60 / BPM;                 // 초

/** 비트 번호 → 초 (프레임 경계로 스냅) */
export const beat = (n) => Math.round(n * BEAT * FPS) / FPS;
/** 초 → μs (엔진 단위) */
export const us = (sec) => Math.round(sec * 1e6);

// 섹션: director.md §4 에너지 골격
export const SECTIONS = [
  { id: "hook",    from: beat(0),  to: beat(3)  },
  { id: "hero",    from: beat(3),  to: beat(9)  },
  { id: "rise",    from: beat(9),  to: beat(22) },
  { id: "endcard", from: beat(22), to: beat(30) },
];

// 화면 전체 충격은 3개 이하 (aesthetic-rules R4)
export const BIG_HITS = [beat(1), beat(22)];

// 장면 카메라 키: 엔진에 카메라가 없으므로 build-project가 각 클립에 변환을 계산해 넣는다
export const CAMERA = {
  hero: [
    { t: beat(3), cx: 540, cy: 960, zoom: 0.9 },
    { t: beat(7), cx: 540, cy: 960, zoom: 1.0, easing: "easeInOutQuart" },
  ],
};

// 샷 배치: 샷 카드 이름과 그 샷에 넘길 내용
export const SHOTS = [
  { card: "hook-number-slam",    section: "hook",    from: beat(0),  to: beat(3),  props: { number: "3초", caption: "설명 한 줄" } },
  { card: "hero-tilt-push",      section: "hero",    from: beat(3),  to: beat(9),  props: { image: "assets/hero@2x.png" } },
  { card: "feature-mask-reveal", section: "rise",    from: beat(9),  to: beat(14), props: { image: "assets/f1@2x.png", text: "혜택 하나" } },
  { card: "price-countup",       section: "rise",    from: beat(18), to: beat(22), props: { from: 9000, to: 29900, unit: "원" } },
  { card: "endcard-logo-cta",    section: "endcard", from: beat(22), to: beat(30), props: { logo: "assets/logo.svg", message: "메시지", cta: "지금 시작하기" } },
];

export const DURATION = SECTIONS.at(-1).to;
