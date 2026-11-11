// 참신안 카드: 황당한 설정을 끝까지 진지하게 찍는 브랜드 필름식 기획안을 뽑고, 말이 되는지 검사한다 (references/novel-concepts.md).
// 아이디어 카드(idea-core.mjs)가 안전한 이야기 장치라면, 참신안은 장르·페인 포인트·제품 역할·진지함의 결·엔딩 다섯 칸을 섞어 매번 다른 세계관을 만든다.
// 특정 광고를 흉내 내지 않도록 칸은 장르 문법만 담고, 실제 광고의 장면·대사·캐릭터는 넣지 않는다.
// 순수 모듈: 스킬 CLI(idea.mjs, gallery.mjs)가 쓰고, 앱 MCP가 같이 쓰려면 sync-skill-mcp.mjs 복사 목록에 이 파일을 더한다.
//
// drawNovel({ request, history, exclude, seed, recent }) → 참신안 하나 (최근 광고·같은 목록에서 쓴 칸은 남는 게 있으면 피함)
// novelCount(request, asked) → 기획안 목록에 넣을 참신안 수 (기본 1, 요청에 "참신·병맛·B급" 같은 낱말이 있거나 asked=2면 2)
// checkNovel({ request, novel, logline, product, benefits, copy, keyScene, evidence }) → { ok, problems, questions }
import { categoriesFor, checkConcept } from './idea-core.mjs';

/**
 * 다섯 축. 칸마다 how(어떻게 쓰는지), 장르는 overlay(장르 문법을 살릴 모션그래픽)와 look(생성 영상 프롬프트용 영어 조각).
 * avoidCats: 이 업종 요청이면 안 뽑음 (idea-core.mjs CATEGORY_RULES의 id)
 */
export const NOVEL_AXES = [
  {
    id: 'genre',
    label: '장르·포맷',
    options: [
      { id: 'nature-doc', label: '자연 다큐', how: '제품·소비자를 생태계의 생물처럼 관찰한다', overlay: '종 이름 하단 자막, 관찰 일지 날짜·위치 칩, 지도 핀', look: 'wildlife documentary, long lens, patient observational framing, natural light' },
      { id: 'sports-cast', label: '스포츠 중계', how: '사소한 일상을 결승전처럼 중계한다', overlay: '스코어보드, 선수 프로필 카드, 리플레이 와이프, 기록 그래프', look: 'live sports broadcast, telephoto, slow-motion replay, stadium lighting' },
      { id: 'breaking-news', label: '뉴스 속보', how: '아주 작은 사건을 국가적 속보로 다룬다', overlay: '속보 띠, 하단 티커, 현장 연결 분할 화면, 시간 표기', look: 'TV news field report, handheld, on-location daylight' },
      { id: 'period-drama', label: '사극·궁중극', how: '현대의 문제를 조선 궁중의 일처럼 다룬다', overlay: '세로 붓글씨 제목, 인물 이름·관직 자막, 두루마리 펼침', look: 'Korean historical drama, Joseon palace interior, warm candlelight, symmetrical framing' },
      { id: 'sentai', label: '전대물·특촬', how: '평범한 사람이 변신 히어로가 되어 일상의 악당과 싸운다', overlay: '변신 타이틀 카드, 필살기 이름 슬램, 폭발 플래시, 에피소드 번호', look: 'tokusatsu hero show, bold primary colors, practical explosion flashes, low angle' },
      { id: 'courtroom', label: '법정극', how: '사소한 다툼을 법정에서 끝까지 다툰다', overlay: '증거 번호 카드, 판결문 타자, 증언 자막, 의사봉 컷', look: 'courtroom drama, wood paneling, tense close-ups, cool overhead light' },
      { id: 'noir', label: '누아르', how: '흔한 고민을 비 오는 밤의 사건처럼 독백한다', overlay: '독백 자막, 사건 파일 클립, 실루엣 마스크 전환', look: 'neo-noir, rain-soaked night street, neon reflections, hard side light' },
      { id: 'heist', label: '케이퍼·작전극', how: '평범한 목표를 정밀한 작전처럼 수행한다', overlay: '작전 지도 HUD, 팀원 소개 카드, 카운트다운, 단계 체크리스트', look: 'heist thriller, blueprint table, dramatic top light, quick insert shots' },
      { id: 'martial-arts', label: '무협', how: '일상의 기술을 무림 고수의 비급처럼 전수한다', overlay: '초식 이름 붓글씨, 내공 게이지, 문파 현판 제목', look: 'wuxia film, misty mountains, flowing robes, slow-motion leaps' },
      { id: 'space-sf', label: 'SF 우주 탐사', how: '집 안의 일을 미지의 행성 탐사처럼 보고한다', overlay: '미션 로그, 산소·연료 게이지 HUD, 궤도 선 그리기', look: 'science fiction space mission, cockpit monitors, cold blue light, slow dolly' },
      { id: 'mockumentary', label: '페이크 다큐·인터뷰', how: '관계자들이 이 일을 아주 진지하게 증언한다', overlay: '인터뷰 이름·직함 자막, 자료 화면 번호, 연도 타임라인', look: 'mockumentary interview, two-camera setup, soft window light, plain office backdrop' },
      { id: 'cooking-show', label: '요리 경연', how: '제품과 상관없는 일을 요리 경연처럼 심사한다', overlay: '심사 점수판, 제한 시간 원형 게이지, 탈락·합격 도장', look: 'cooking competition show, bright studio, overhead counter shots, judges table' },
      { id: 'thriller', label: '심리 스릴러', how: '작은 불안을 서스펜스로 키운다', overlay: '심장 박동 선, 깜빡이는 시간 자막, 글리치 컷', look: 'psychological thriller, dim apartment, slow push-in, shallow depth of field' },
      { id: 'melodrama', label: '신파 멜로', how: '사람과 물건 사이의 이별·재회를 절절하게 그린다', overlay: '회상 필름 테두리, 손글씨 편지 자막, 계절 자막', look: 'Korean melodrama, soft backlight, falling snow or petals, slow motion' },
      { id: 'game-quest', label: '게임 퀘스트', how: '일상을 RPG 퀘스트처럼 진행한다', overlay: '퀘스트 창, 경험치 바, 아이템 획득 팝업, 레벨 업', look: 'video game cutscene feel, stylized lighting, over-the-shoulder framing' },
      { id: 'safety-video', label: '공익 안전교육 영상', how: '옛날 안전교육 영상처럼 일상의 위험을 교육한다', overlay: '번호 매긴 수칙 카드, 올바른 예·잘못된 예 O·X, 경고 표지', look: '1990s public safety training video, flat lighting, slightly faded colors' },
    ],
  },
  {
    id: 'pain',
    label: '페인 포인트',
    options: [
      { id: 'social-pressure', label: '사회적 압박', how: '회의 지옥, 명절 잔소리, 출퇴근처럼 누구나 아는 압박' },
      { id: 'micro-annoyance', label: '아주 사소한 짜증', how: '이어폰 줄 꼬임, 마지막 한 장 남은 휴지처럼 작지만 매일인 일' },
      { id: 'indecision', label: '우유부단', how: '장바구니에 담아 두고 일주일째 못 고르는 마음' },
      { id: 'tiny-obsession', label: '혼자만의 집착', how: '남이 보면 별것 아닌데 본인에겐 목숨 같은 고집' },
      { id: 'awkward-moment', label: '어색한 순간', how: '엘리베이터 침묵, 이름이 기억 안 나는 인사처럼 민망한 몇 초' },
      { id: 'tech-betrayal', label: '기술의 배신', how: '하필 그때 꺼지는 배터리, 엉뚱한 추천 알고리즘' },
      { id: 'time-poverty', label: '시간 부족', how: '10분이 모자란 아침, 점심시간에 다 못 하는 일' },
      { id: 'self-image', label: '나를 보는 나', how: '사진 속 내 모습, 예전보다 약해진 체력 같은 자기 인식' },
      { id: 'generation-gap', label: '세대 차이', how: '부모님의 단체 카톡, 신입의 줄임말처럼 말이 안 통하는 순간' },
      { id: 'small-fear', label: '작은 공포', how: '읽음 표시, 택배 분실, 냉장고 속 정체 모를 반찬' },
    ],
  },
  {
    id: 'role',
    label: '제품의 역할',
    options: [
      { id: 'savior', label: '마지막 열쇠', how: '모든 수가 막힌 뒤 단 하나 남은 해결책 (흔하니 다른 칸을 더 비틀기)' },
      { id: 'culprit', label: '사건의 원인', how: '제품이 너무 좋아서 사건이 커진다 (장점이 곧 사건의 원인)', avoidCats: ['finance', 'medical', 'health-food'] },
      { id: 'too-good', label: '너무 유능함', how: '제품이 지나치게 잘해서 주인공이 할 일이 없어진다' },
      { id: 'witness', label: '조용한 목격자', how: '제품이 모든 일을 곁에서 지켜본 증인으로 나온다' },
      { id: 'rival', label: '라이벌', how: '주인공이 제품을 이기려다 결국 인정한다' },
      { id: 'mentor', label: '스승', how: '제품이 주인공을 가르치고 이끈다' },
      { id: 'macguffin', label: '모두가 찾는 물건', how: '등장인물 모두가 그 제품 하나를 쫓는다' },
      { id: 'misunderstood', label: '오해받는 존재', how: '처음엔 귀찮거나 수상해 보였는데 끝에 진가가 드러난다' },
    ],
  },
  {
    id: 'tone',
    label: '진지함의 결',
    options: [
      { id: 'dry-doc', label: '건조한 관찰', how: '감정 없는 내레이션이 사실만 말한다' },
      { id: 'epic-pathos', label: '과장된 비장미', how: '사소한 일에 목숨을 건 듯 장엄한 음악과 슬로모션' },
      { id: 'resigned', label: '시니컬한 체념', how: '모든 걸 내려놓은 무기력한 말투' },
      { id: 'deadpan-official', label: '무표정 공식 발표', how: '기자회견·안내 방송처럼 딱딱하고 공식적인 말투' },
      { id: 'earnest-passion', label: '진심 어린 열정', how: '아무도 시키지 않았는데 혼자 너무 진심이다' },
      { id: 'hushed-suspense', label: '숨죽인 긴장', how: '속삭이는 말투, 침 넘기는 소리까지 들리는 긴장', avoidCats: ['kids'] },
    ],
  },
  {
    id: 'ending',
    label: '엔딩 장치',
    options: [
      { id: 'meta-break', label: '제4의 벽', how: '인물이 갑자기 카메라를 보고 "이거 광고잖아"처럼 상황을 짚는다' },
      { id: 'cool-cynic', label: '쿨한 마무리', how: '"알 바 아니지만 혜택은 챙기세요" 같은 시니컬한 한 줄' },
      { id: 'warm-turn', label: '뜻밖의 온기', how: '황당하게 웃기다가 마지막에 작은 위로 한 줄' },
      { id: 'escalate-cut', label: '더 커지고 뚝', how: '사건이 한 번 더 커지는 순간 엔드카드로 끊는다' },
      { id: 'narrator-fight', label: '내레이터와 다툼', how: '내레이터와 주인공이 서로 말을 끊으며 티격태격한다' },
      { id: 'sequel-tease', label: '다음 편 예고', how: '"다음 이야기"처럼 시리즈를 예고하며 끝난다 (댓글을 부르는 여백)' },
    ],
  },
];

const AXIS_IDS = NOVEL_AXES.map((a) => a.id);
const KIDS_DARK = ['noir', 'thriller', 'courtroom', 'heist'];
// 업종별로 안 쓰는 장르: 신뢰가 먼저인 업종은 어둡거나 범죄를 다루는 장르를 피하고, 식품은 위생 불안을 부르는 장르를 피한다
const GENRE_AVOID = { kids: KIDS_DARK, medical: ['thriller', 'noir', 'heist', 'courtroom', 'safety-video'], finance: ['heist', 'noir', 'thriller'], food: ['thriller'] };
// 참신안을 2개로 늘리는 요청 낱말
const MORE_WORDS = /참신|기발|병맛|b급|엉뚱|파격|돌고래|브랜드 ?필름|바이럴|세계관|페이크 ?다큐|novel|absurd/i;

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

/** 기획안 목록에 넣을 참신안 수. asked(--novel N)가 있으면 그 수(0–2), 없으면 요청 낱말로 1 또는 2 */
export function novelCount(request, asked) {
  if (asked !== undefined && asked !== null && asked !== '') return Math.max(0, Math.min(2, Number(asked) || 0));
  return MORE_WORDS.test(String(request ?? '')) ? 2 : 1;
}

/** 칸 고르기 기록 형식: { genre: id, pain: id, role: id, tone: id, ending: id } */
export const novelChoices = (novel) => Object.fromEntries(AXIS_IDS.map((a) => [a, novel?.picks?.[a]?.id ?? novel?.[a]]));

/**
 * 참신안 하나 뽑기. 최근 recent편 기록(h.novel)과 같은 목록(exclude)에서 쓴 칸은 남는 칸이 있으면 피하고,
 * 최근 참신안과 칸이 2개 넘게 같으면 다시 뽑는다(최대 40번).
 * @returns {{ kind: 'novel', id: 'novel', name, seed, picks, line, story, summary, categories }}
 */
export function drawNovel({ request = '', history = [], exclude = [], seed, recent = 6 } = {}) {
  const s0 = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
  const r = rng(s0);
  const cats = categoriesFor(request).map((c) => c.id);
  const past = history.slice(-recent).map((h) => h?.novel).filter(Boolean);
  const taken = exclude.map((x) => (x?.picks ? novelChoices(x) : x)).filter(Boolean);
  const pick = () => {
    const picks = {};
    for (const axis of NOVEL_AXES) {
      let pool = axis.options.filter((o) => !(o.avoidCats ?? []).some((c) => cats.includes(c)));
      if (axis.id === 'genre') pool = pool.filter((o) => !cats.some((c) => (GENRE_AVOID[c] ?? []).includes(o.id)));
      const notTaken = pool.filter((o) => !taken.some((t) => t[axis.id] === o.id));
      if (notTaken.length) pool = notTaken;
      const fresh = pool.filter((o) => !past.some((p) => p[axis.id] === o.id));
      if (fresh.length) pool = fresh;
      picks[axis.id] = pool[Math.floor(r() * pool.length)];
    }
    return picks;
  };
  let picks = pick();
  const same = (p, q) => AXIS_IDS.filter((a) => p[a].id === q[a]).length;
  for (let i = 0; i < 40 && [...past, ...taken].some((q) => same(picks, q) > 2); i++) picks = pick();
  const { genre, pain, role, tone, ending } = picks;
  return {
    kind: 'novel',
    id: 'novel',
    name: `참신안 · ${genre.label} × ${role.label}`,
    seed: s0,
    picks,
    line: `${genre.label} 문법과 ${tone.label} 톤으로 "${pain.label}"을 끝까지 진지하게 찍는다. 제품의 역할: ${role.label}`,
    story: `훅 극현실의 "${pain.label}" 한 장면(1초, ${genre.label} 문법) → 비일상이 끼어듦 → ${tone.label} 톤의 대소동(${genre.overlay}) → 제품(역할: ${role.label})이 이야기를 푸는 장면 → 엔딩: ${ending.label} → 엔드카드`,
    summary: NOVEL_AXES.map((a) => `${a.label} ${picks[a.id].label}`).join(' · '),
    ...(cats.length ? { categories: cats } : {}),
  };
}

/**
 * 참신안이 말이 되는지 검사. checkConcept의 로그라인·업종 문구·근거 검사에 참신안 전용 검사를 더한다.
 * @param {object} o
 * @param {object} o.novel  drawNovel 결과 또는 { genre, pain, role, tone, ending } 칸 id
 * @param {string} [o.keyScene]  제품이 없으면 이야기가 안 풀리는 장면 한 줄 (참신안의 핵심)
 * 그 밖의 칸은 checkConcept와 같음 (request, logline, product, benefits, copy, evidence)
 */
export function checkNovel(o = {}) {
  const base = checkConcept({ ...o, idea: undefined });
  const problems = [...base.problems];
  const ch = novelChoices(o.novel);
  const cats = categoriesFor(o.request ?? '').map((c) => c.id);
  for (const axis of NOVEL_AXES) {
    const opt = axis.options.find((x) => x.id === ch[axis.id]);
    if (!opt) {
      problems.push(`참신안의 ${axis.label} 칸이 없거나 모르는 값입니다 (references/novel-concepts.md)`);
      continue;
    }
    const bad = (opt.avoidCats ?? []).filter((c) => cats.includes(c));
    if (axis.id === 'genre') for (const c of cats) if ((GENRE_AVOID[c] ?? []).includes(opt.id)) bad.push(c);
    if (bad.length) problems.push(`${axis.label} 칸 "${opt.label}"은 이 업종(${[...new Set(bad)].join('·')}) 광고에 쓰지 않습니다`);
  }
  const key = String(o.keyScene ?? '').trim();
  if (!key) problems.push('제품이 열쇠가 되는 장면 한 줄(keyScene)이 없습니다: 제품을 빼면 이야기가 안 풀리는 장면을 적습니다');
  else if (o.product && !key.toLowerCase().includes(String(o.product).toLowerCase())) problems.push(`keyScene에 제품 "${o.product}"가 없습니다`);
  const questions = [
    '제품을 빼면 이 이야기가 풀리지 않나요? 풀린다면 제품이 장식일 뿐이니 역할이나 사건을 바꿉니다.',
    '황당한 설정이 제품의 실제 장점 한 가지를 과장한 것인가요? 장점과 상관없는 황당함은 뺍니다.',
    '인물이 끝까지 진지한가요? 웃음을 노린 표정·효과음·자막(ㅋㅋ, 땀방울 이모지 등)을 넣으면 간극이 사라집니다.',
    '특정 광고·영화·드라마의 장면, 대사, 캐릭터를 따라 한 곳이 있나요? 장르 문법만 쓰고 장면은 새로 짭니다.',
    '이 업종의 시청자가 불쾌하거나 브랜드 신뢰가 떨어질 장면(위생, 돈, 건강, 아이에게 무서운 장면)이 있나요?',
  ];
  return { ok: !problems.length, problems: [...new Set(problems)], questions, ...(base.categories ? { categories: base.categories } : {}) };
}

/** 씬표 맨 위에 붙일 글 */
export function novelText(novel) {
  const p = novel.picks;
  return [
    `참신안 (seed ${novel.seed})`,
    ...NOVEL_AXES.map((a) => `- ${a.label}: ${p[a.id].label} — ${p[a.id].how}`),
    `- 장르 그래픽(모션 오버레이): ${p.genre.overlay}`,
    `- 영상 프롬프트 조각: ${p.genre.look}`,
    `- 이야기: ${novel.story}`,
  ].join('\n');
}
