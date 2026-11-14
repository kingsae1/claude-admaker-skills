// 변주 카드: 같은 모션 방향이라도 광고마다 구도·글자 처리·그래픽 층·빛·카메라·전환·색·리듬을 다르게 뽑는다.
// 순수 모듈(파일·CLI 없음). 스킬 templates/variety.mjs(CLI)와 앱 MCP get_gallery가 같이 쓴다. 규칙은 references/variety.md.
//
// drawCard({ direction, seed, history, exclude }) → { seed, direction, picks: { 축id: { id, label, how } }, summary, key }
//  - direction에 맞지 않는 칸(only / avoid)은 빼고, 최근 history에 쓴 칸은 피하고(남는 칸이 있을 때만), exclude(같은 목록의 다른 기획안 카드)와도 겹치지 않게 한다.
//  - 최근 광고와 축 절반 이상이 같으면 seed를 바꿔 다시 뽑는다.

/**
 * 축과 칸. only: 이 방향에서만, avoid: 이 방향에서는 안 씀, fits: 이 방향이면 더 자주(가중치 +2).
 * how는 씬표·ProjectJSON에 옮길 구현 힌트(엔진·샷 카드 이름).
 */
export const AXES = [
  {
    id: 'layout',
    label: '구도',
    options: [
      { id: 'left-grid', label: '왼쪽 정렬 그리드', how: '12칸 그리드, 문구 왼쪽 정렬, 번호 라벨·구분선', fits: ['editorial-kinetic', 'info-map'] },
      { id: 'center-stack', label: '중앙 대칭', how: '가운데 축에 주인공 하나, 위아래로 라벨·CTA', fits: ['product-hero', 'glossy-signature'] },
      { id: 'split', label: '분할 화면', how: '화면을 2–3칸으로 나눠 소재와 문구를 칸마다, 칸 경계가 박에 밀림', fits: ['beat-montage', 'offer-punch'] },
      { id: 'diagonal', label: '대각선 구도', how: '문구 줄·띠를 −8~−12° 기울여 화면을 가로지름', avoid: ['pixel-retro'] },
      { id: 'frame-in-frame', label: '프레임 속 프레임', how: '소재를 화면 안 카드·창·폰 화면에 넣고 카드 밖에 그래픽', fits: ['spatial-3d', 'product-hero'] },
      { id: 'full-bleed-type', label: '화면을 넘는 큰 글자', how: '문구 한 단어가 화면 폭 110–140%, 소재는 글자 뒤·속(트랙 매트)', fits: ['editorial-kinetic', 'glitch-tech'] },
      { id: 'collage-scatter', label: '흩어진 조각 콜라주', how: '기울어진 사진 조각 3–5장 + 테이프·스티커, 그룹(group-build)으로 박마다', fits: ['print-collage', 'playful-bounce'] },
      { id: 'stage-floor', label: '무대 바닥', how: '하단 1/3이 바닥 줄(도트·도형), 캐릭터·오브젝트가 그 위에서 움직임', only: ['pixel-retro', 'playful-bounce'] },
    ],
  },
  {
    id: 'type',
    label: '주인공 글자 처리',
    options: [
      { id: 'glyph-3d-flip', label: '글자 단위 3D 뒤집힘', how: 'characterAnimation flipInX·tumbleIn (aesthetic-rules F3)', avoid: ['pixel-retro'] },
      { id: 'mask-rise', label: '마스크 상승', how: '줄마다 wipe up + y 상승, expo.out', fits: ['editorial-kinetic', 'product-hero'] },
      { id: 'slam-scale', label: '박에 슬램', how: 'scale 1.6→1 back 이징 + 화면 흔들림(shake) 1회', fits: ['offer-punch', 'beat-montage'] },
      { id: 'typewriter', label: '타자·커서', how: '글자 하나씩(stagger), 끝에 커서 깜빡', fits: ['glitch-tech'] },
      { id: 'marquee', label: '흐르는 마키 줄', how: '같은 문구 줄 2–3개가 반대 방향으로 흐름', fits: ['editorial-kinetic'] },
      { id: 'outline-draw', label: '윤곽선이 그려짐', how: 'text_to_path → stroke만 + strokeDraw, 다 그려지면 채움', fits: ['handwritten-warm', 'print-collage'] },
      { id: 'pixel-type', label: '도트 글자 계단 등장', how: '도트 폰트, y·scale keyframes steps(4)', only: ['pixel-retro'] },
      { id: 'glitch-settle', label: '글리치 깜빡 정착', how: 'x ±30 흔들림 steps(3) + rgbSplit 2프레임 후 정착(glitch-hit)', only: ['glitch-tech', 'beat-montage'] },
      { id: 'stamp', label: '도장 찍기', how: 'scale 1.3→1 + angle −6→−3, 착지 프레임에 하프톤 번짐', fits: ['print-collage', 'offer-punch'] },
      { id: 'depth-pass', label: '깊이에서 다가옴', how: 'z −900→0 + opacity, 지나간 문구는 z +로 통과(z-fly-through)', fits: ['spatial-3d'], avoid: ['pixel-retro'] },
    ],
  },
  {
    id: 'support',
    label: '그래픽 지원 층',
    options: [
      { id: 'shape-burst', label: '도형 버스트', how: '별·원·삼각형 6–10개가 박에 터짐(도형 시트)', fits: ['playful-bounce', 'offer-punch'] },
      { id: 'lines-rings', label: '선·링', how: '가는 링이 퍼지고 직선이 그려짐(strokeDraw)', fits: ['product-hero', 'info-map'] },
      { id: 'stickers', label: '스티커·배지', how: '기울어진 원형 배지·말풍선, back 이징 착지', fits: ['offer-punch', 'playful-bounce'] },
      { id: 'halftone', label: '하프톤 점 면', how: 'dotFilter 면 또는 점 패턴 PNG가 마스크로 열림', fits: ['print-collage'] },
      { id: 'pixel-blocks', label: '픽셀 블록·코인', how: '도트 블록·코인·별 스프라이트(spriteSheet), steps 이동', only: ['pixel-retro'] },
      { id: 'hud', label: 'HUD 브래킷·좌표', how: '모서리 괄호·좌표 숫자·스캔 막대가 대상 둘레에', fits: ['glitch-tech', 'product-hero', 'spatial-3d'] },
      { id: 'lottie', label: 'Lottie 포인트', how: '체크·반짝이·하트 Lottie 0.6–1초(lottie-accent)', avoid: ['glitch-tech', 'pixel-retro'] },
      { id: 'marker', label: '굵은 마커 강조', how: '핵심 단어 둘레 동그라미·밑줄(hand-drawn-emphasis)', fits: ['offer-punch', 'handwritten-warm'] },
      { id: 'grouped-chips', label: '정보 칩 덩어리', how: '칩 3개를 그룹으로 묶어 한 판처럼 등장(group-build)', fits: ['product-hero', 'info-map', 'spatial-3d'] },
    ],
  },
  {
    id: 'light',
    label: '빛·질감 층',
    options: [
      { id: 'sweep', label: '빛 스윕', how: '사선 빛띠가 주인공 위를 한 번 지나감(SVG 그라데이션 이미지)', avoid: ['pixel-retro', 'print-collage'] },
      { id: 'glow-pulse', label: '글로우 맥동', how: '주인공 하나에 glowFilter·bloomFilter가 박마다 살짝', fits: ['glossy-signature', 'product-hero'], avoid: ['print-collage'] },
      { id: 'rgb-split', label: 'RGB 분리', how: 'rgbSplitFilter 드롭마다 2–4프레임', fits: ['glitch-tech'], avoid: ['handwritten-warm'] },
      { id: 'scanlines', label: '스캔라인', how: '가로줄 패턴 PNG 낮은 불투명도 + 위아래로 천천히 흐름', only: ['glitch-tech', 'pixel-retro'] },
      { id: 'paper', label: '종이 결·잉크', how: '종이 질감 PNG multiply + 리소 2색 겹침 어긋남', only: ['print-collage', 'handwritten-warm'] },
      { id: 'bokeh', label: '빛 망울', how: '흐린 원 4–6개가 깊이별로 다른 속도로 흐름', fits: ['spatial-3d', 'glossy-signature'], avoid: ['pixel-retro', 'glitch-tech'] },
      { id: 'pixelate-tex', label: '도트 질감', how: '소재에 pixelateFilter size 6–10, 시그니처 장면에서만 풀림', only: ['pixel-retro'] },
      { id: 'god-rays', label: '빛내림', how: 'godrayFilter를 시그니처 장면 하나에, 빛 각도가 천천히 돎', fits: ['glossy-signature', 'product-hero'], avoid: ['pixel-retro', 'glitch-tech', 'print-collage'] },
      { id: 'floor-reflection', label: '바닥 반사', how: '제품·로고 아래 reflectionFilter, 어두운 바탕에서', fits: ['product-hero', 'spatial-3d'], avoid: ['pixel-retro', 'print-collage', 'playful-bounce'] },
      { id: 'tilt-shift', label: '미니어처 초점', how: 'tiltShiftFilter로 위아래를 흐리게, 지도·도시·진열 장면', fits: ['info-map', 'spatial-3d'], avoid: ['pixel-retro', 'glitch-tech'] },
      { id: 'flash-frames', label: '색 플래시 프레임', how: '드롭 박에 브랜드 색 면 1–2프레임', fits: ['beat-montage', 'editorial-kinetic'] },
    ],
  },
  {
    id: 'camera',
    label: '카메라',
    options: [
      { id: 'push-in', label: '천천히 밀고 들어감', how: '장면마다 zoom 1→1.08 (engine-recipes §4)' },
      { id: 'pull-out', label: '빠지며 드러냄', how: 'zoom 1.25→1, 마지막에 전체 구성이 보임' },
      { id: 'pan', label: '옆으로 흐름', how: 'cx를 장면마다 한 방향으로, 층마다 패럴랙스 계수', avoid: ['pixel-retro'] },
      { id: 'dutch-zoom', label: '회전 줌', how: 'zoom + angle 0→3°, 드롭에서 반대로, 드롭 2–3프레임 radialBlurFilter', avoid: ['pixel-retro', 'info-map'] },
      { id: 'z-dolly', label: 'Z축 돌리', how: '모든 층에 같은 z 이동(z-fly-through)', fits: ['spatial-3d'], avoid: ['pixel-retro'] },
      { id: 'beat-punch', label: '박마다 펀치', how: '정지했다가 박에 zoom 1→1.06→1 (0.15초)', fits: ['beat-montage', 'offer-punch', 'glitch-tech'] },
      { id: 'step-scroll', label: '칸 단위 스크롤', how: '화면이 도트 칸 단위로 옆 스크롤(steps)', only: ['pixel-retro'] },
    ],
  },
  {
    id: 'transition',
    label: '전환 계열',
    options: [
      { id: 'cover-flood', label: '색이 번져 덮기', how: 'am-cover-flood (transition-cover-flood)' },
      { id: 'flash-streak', label: '빛줄기 플래시', how: 'am-flash-streak (transition-flash-streak)', avoid: ['handwritten-warm'] },
      { id: 'zoom-through', label: '링 안으로 줌', how: 'am-zoom-through (transition-zoom-through)', avoid: ['pixel-retro'] },
      { id: 'card-swap', label: '카드 넘김', how: 'am-card-swap / transition-footage-card', fits: ['product-hero', 'spatial-3d'], avoid: ['pixel-retro'] },
      { id: 'ink-bleed', label: '잉크 번짐', how: 'am-ink-bleed', fits: ['print-collage', 'handwritten-warm'], avoid: ['glitch-tech', 'pixel-retro'] },
      { id: 'pixelize', label: '픽셀화', how: 'pixelize 전환 또는 blockReveal 큰 블록', fits: ['pixel-retro', 'glitch-tech'] },
      { id: 'matte-text', label: '글자 속으로', how: '트랙 매트 style.matte로 큰 글자 안에 다음 장면(transitions.md)', fits: ['editorial-kinetic'], avoid: ['pixel-retro'] },
      { id: 'match-cut', label: '매치 컷', how: 'transition-match-cut, 양쪽 움직임 방향 맞춤' },
      { id: 'glitch-cut', label: '글리치 컷', how: 'glitch-hit를 컷 양쪽 2프레임씩', only: ['glitch-tech', 'beat-montage'] },
      { id: 'star-reveal', label: '별 모양으로 열림', how: 'starReveal 마스크로 다음 소재가 별 모양으로 커지며 열림', fits: ['playful-bounce', 'offer-punch'], avoid: ['glitch-tech', 'spatial-3d'] },
      { id: 'push', label: '밀어내기', how: 'am-push direction + blur, 박에 맞춰', fits: ['beat-montage', 'offer-punch'] },
      { id: 'shape-grid', label: '도형 타일 덮기', how: 'transition-shape-grid, 대각선 순서로 사각 타일 + 원·반원 조각 (모션 씬 들어갈 때)', fits: ['editorial-kinetic', 'playful-bounce', 'offer-punch'], avoid: ['handwritten-warm', 'pixel-retro'] },
      { id: 'ring-iris', label: '링 호 아이리스', how: 'transition-ring-iris, 동심원 링이 차올라 덮고 주인공 쪽에서 열림', fits: ['product-hero', 'glossy-signature', 'info-map'], avoid: ['pixel-retro'] },
    ],
  },
  {
    id: 'color',
    label: '색 운용',
    options: [
      { id: 'two-tone', label: '브랜드 2색 대비', how: '바탕·글자를 브랜드 두 색으로, 장면마다 맞바꿈' , avoid: ['pixel-retro'] },
      { id: 'mono-accent', label: '무채색 + 포인트 1', how: '검정·흰색 + 브랜드 포인트 한 색만' , avoid: ['pixel-retro'] },
      { id: 'dark-glow', label: '어두운 바탕', how: '짙은 바탕 + 밝은 글자·포인트 글로우', avoid: ['playful-bounce', 'handwritten-warm', 'pixel-retro'] },
      { id: 'scene-swap', label: '장면마다 바탕색 교체', how: '컷마다 브랜드 팔레트 안에서 바탕색이 바뀜(cover-flood와 잘 맞음)' , avoid: ['pixel-retro'] },
      { id: 'duotone', label: '듀오톤 소재', how: '소재를 브랜드 2색 듀오톤(colorMap)으로, 시그니처에서 원색 복귀', avoid: ['pixel-retro'] },
      { id: 'mono-to-color', label: '흑백 → 컬러', how: '소재가 grayscaleFilter 흑백으로 시작해 시그니처 박에 컬러로', avoid: ['pixel-retro', 'playful-bounce'] },
      { id: 'limited-palette', label: '8–16색 제한 팔레트', how: '브랜드 색을 램프 2–3단으로 쪼갠 고정 팔레트', only: ['pixel-retro'] },
    ],
  },
  {
    id: 'rhythm',
    label: '리듬',
    options: [
      { id: 'every-beat', label: '박마다', how: '모든 박에 컷이나 히트' },
      { id: 'half-time', label: '2박마다', how: '2박마다 큰 히트, 사이 박은 작은 반응' },
      { id: 'syncopated', label: '엇박', how: '박 사이(8분 뒤)에 히트를 두어 튕기는 느낌' },
      { id: 'build-drop', label: '빌드업 → 드롭 몰아치기', how: '앞 절반은 2박마다 느리게, 드롭부터 박마다 몰아침' },
      { id: 'hold-burst', label: '정지 → 폭발', how: '0.5–1초 완전 정지 뒤 한 박에 모든 층이 터짐' },
    ],
  },
];

const AXIS_IDS = AXES.map((a) => a.id);

/** 요청 문장의 분위기 낱말 → 그 분위기에 맞지 않아 빼는 칸 (남는 칸이 없으면 빼지 않음) */
export const MOODS = [
  { id: 'kids', re: /키즈|어린이|유아|아이|장난감|귀여|친근|발랄|kids?\b/i, avoid: ['dark-glow', 'glitch-settle', 'glitch-cut', 'rgb-split', 'hud', 'scanlines', 'duotone', 'god-rays', 'mono-to-color'] },
  { id: 'premium', re: /고급|프리미엄|럭셔리|명품|차분|미니멀|우아|세련|premium|luxury|minimal/i, avoid: ['shape-burst', 'stickers', 'every-beat', 'flash-frames', 'glitch-settle', 'glitch-cut', 'rgb-split', 'slam-scale', 'dutch-zoom', 'star-reveal', 'lottie', 'syncopated'] },
  { id: 'trust', re: /금융|은행|보험|병원|의료|클리닉|법률|신뢰|공공|bank|insurance|clinic/i, avoid: ['glitch-settle', 'glitch-cut', 'rgb-split', 'stickers', 'dutch-zoom', 'star-reveal', 'shape-burst'] },
  { id: 'warm', re: /감성|따뜻|웨딩|결혼|가족|감사|편지|힐링|warm/i, avoid: ['glitch-settle', 'glitch-cut', 'rgb-split', 'hud', 'scanlines', 'dark-glow', 'flash-frames', 'every-beat'] },
];

/** 요청에 걸린 분위기들 */
export function moodsFor(request) {
  const t = String(request ?? '');
  return t ? MOODS.filter((m) => m.re.test(t)) : [];
}

/** 방향에 쓸 수 있는 칸 */
export function optionsFor(axis, direction) {
  return axis.options.filter((o) => (!o.only || o.only.includes(direction)) && !(o.avoid ?? []).includes(direction));
}

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 카드(또는 기록)의 축id → 칸id */
const choiceMap = (c) => (c?.picks ? Object.fromEntries(Object.entries(c.picks).map(([k, v]) => [k, v.id])) : c?.card ?? c ?? {});

/** 두 카드가 같은 칸을 쓴 축의 비율 (0–1) */
export function similarity(a, b) {
  const x = choiceMap(a), y = choiceMap(b);
  return AXIS_IDS.filter((k) => x[k] && x[k] === y[k]).length / AXIS_IDS.length;
}

/**
 * @param {object} o
 * @param {string} o.direction  모션 방향 id (motion-directions.md), 자유롭게 생성이면 'free'
 * @param {number} [o.seed]
 * @param {object[]} [o.history]  예전 광고 기록(최근 것이 뒤), 각 { direction, card: { 축id: 칸id } }
 * @param {object[]} [o.exclude]  같은 목록에서 이미 뽑은 카드(기획안끼리 겹치지 않게)
 * @param {number} [o.recent]  피할 최근 기록 수 (기본 4)
 * @param {string} [o.request]  요청 문장 — 분위기 낱말(MOODS)에 맞지 않는 칸을 뺌
 */
export function drawCard({ direction = 'free', seed, history = [], exclude = [], recent = 4, request } = {}) {
  const base = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
  const last = history.slice(-recent).map(choiceMap);
  const moods = moodsFor(request);
  const moodAvoid = new Set(moods.flatMap((m) => m.avoid));
  const others = exclude.map(choiceMap);
  let best = null;
  for (let attempt = 0; attempt < 24; attempt++) {
    const r = rng(base + attempt * 7919);
    const picks = {};
    for (const axis of AXES) {
      let pool = optionsFor(axis, direction);
      const fitMood = pool.filter((o) => !moodAvoid.has(o.id));
      if (fitMood.length) pool = fitMood;
      const fresh = pool.filter((o) => !last.some((h) => h[axis.id] === o.id) && !others.some((h) => h[axis.id] === o.id));
      if (fresh.length) pool = fresh;
      const w = pool.map((o) => 1 + ((o.fits ?? []).includes(direction) ? 2 : 0) + (o.only ? 1 : 0));
      let x = r() * w.reduce((s, v) => s + v, 0);
      const o = pool.find((_, i) => (x -= w[i]) < 0) ?? pool[pool.length - 1];
      picks[axis.id] = { id: o.id, label: o.label, how: o.how };
    }
    const card = { picks };
    const worst = Math.max(0, ...[...last, ...others].map((h) => similarity(card, h)));
    if (!best || worst < best.worst) best = { picks, worst, seed: base + attempt * 7919 };
    if (worst < 0.5) break;
  }
  const summary = AXES.map((a) => `${a.label} ${best.picks[a.id].label}`).join(' · ');
  return {
    seed: best.seed,
    direction,
    picks: best.picks,
    summary,
    key: AXES.map((a) => best.picks[a.id].id).join('/'),
    maxSimilarity: Math.round(best.worst * 100) / 100,
    ...(moods.length ? { moods: moods.map((m) => m.id) } : {}),
  };
}

/** 기록 한 줄 (history 파일·DB에 쌓는 형식) */
export function historyEntry(card, extra = {}) {
  // 아이디어·예시도 같이 쌓아 다음 기획안이 최근에 쓴 이야기·예시를 피한다 (idea-core.mjs)
  const idea = typeof card.idea === 'string' ? card.idea : card.idea?.id;
  const example = typeof card.example === 'string' ? card.example : card.example?.id;
  // 참신안이면 칸 id도 쌓아 다음 참신안이 최근 장르·역할·톤을 피한다 (novel-core.mjs)
  const novel = card.novel && typeof card.novel === 'object' ? card.novel : null;
  return { at: new Date().toISOString(), direction: card.direction, card: choiceMap(card), ...(idea ? { idea } : {}), ...(example ? { example } : {}), ...(novel ? { novel } : {}), ...extra };
}

/** 카드를 씬표 맨 위에 붙일 글 */
export function cardText(card) {
  return [`변주 카드 (${card.direction}, seed ${card.seed})`, ...AXES.map((a) => `- ${a.label}: ${card.picks[a.id].label} — ${card.picks[a.id].how}`)].join('\n');
}
