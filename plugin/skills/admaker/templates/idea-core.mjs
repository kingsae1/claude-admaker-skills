// 아이디어 카드: 광고의 이야기 장치(무엇을 어떤 순서로 보여 주는지)를 고르고, 그 아이디어가 말이 되는지 검사한다.
// 모양(모션 방향·변주 카드)은 화면을, 아이디어는 이야기를 정한다. 둘 다 광고마다 달라야 광고끼리 닮지 않는다 (references/ideas.md).
// 순수 모듈: 스킬 CLI(idea.mjs, gallery.mjs)와 앱 MCP(get_gallery, check_concept)가 같이 쓴다 (sync-skill-mcp.mjs가 앱으로 복사).
//
// drawIdea({ request, history, exclude, seed, evidence }) → 아이디어 하나 (요청 낱말에 맞고, 최근 광고·같은 목록에서 쓴 아이디어는 피함)
// checkConcept({ request, idea, logline, product, benefits, copy, evidence }) → { ok, problems, questions }
// rerankDirections(ranked, history) → 최근에 쓴 방향은 점수를 낮추고, 점수가 같으면 덜 쓴 방향을 앞으로

/**
 * 이야기 장치. generic: 낱말이 안 맞을 때 어느 업종에나 쓰는 기본 후보, fits: 어울리는 요청 낱말, avoid: 쓰면 안 되는 요청 낱말(업종·목적), needs: 있어야 하는 소재·자료,
 * sense: 말이 되는 조건(이게 안 되면 다른 아이디어로), story: 훅 → … → 엔드카드
 */
export const IDEAS = [
  {
    id: 'before-after',
    name: '비포 → 애프터',
    line: '쓰기 전과 쓴 뒤를 같은 구도로 보여 주고 차이를 제품이 만든다',
    story: '훅 불편한 전 상태 → 제품 등장·사용 → 같은 구도의 달라진 후 상태 → 엔드카드',
    fits: ['청소', '세탁', '정리', '수리', '인테리어', '리모델링', '헬스', '운동', '헤어', '미용실', '네일', '세차', '정비', '이사'],
    avoid: ['병원', '의원', '클리닉', '시술', '성형', '피부과', '치과', '다이어트', '건강기능', '영양제', '금융', '보험', '대출'],
    needs: '같은 대상의 실제 전·후 사진 (지어낸 결과 금지, copy.md §7)',
    sense: '전·후 차이가 제품 하나로 설명되고, 실제 자료로 보여 줄 수 있다',
    needsEvidence: ['before-after'],
  },
  {
    id: 'problem-solution',
    generic: true,
    name: '불편 → 해결',
    line: '누구나 겪는 불편 한 장면에서 시작해 제품이 그 장면을 바꾼다',
    story: '훅 흔한 불편(1초) → 제품이 끼어듦 → 해결된 같은 장면 → 장점 한 줄 → 엔드카드',
    fits: ['앱', '서비스', '배달', '배송', '가전', '생활', '보험', '예약', '구독', '도구', '렌탈', '플랫폼', '학원'],
    avoid: [],
    needs: '불편 장면과 해결 장면 (사용자 사진 또는 생성 이미지)',
    sense: '불편이 실제로 흔하고, 그 불편을 이 제품이 직접 푼다(제품을 빼면 해결이 안 됨)',
  },
  {
    id: 'product-pov',
    name: '제품의 하루',
    line: '제품이 쓰이는 순간들을 제품 곁에서 따라간다',
    story: '훅 제품 클로즈업 → 쓰이는 순간 2–3개(장소가 바뀜) → 제품 정면 → 엔드카드',
    fits: ['텀블러', '가방', '신발', '운동화', '이어폰', '전자', '노트북', '음료', '커피', '향수', '패션', '자전거', '차량'],
    avoid: ['금융', '보험', '대출', '병원', '의원', '공공', '법률'],
    needs: '제품 사진(누끼 또는 여러 각도)',
    sense: '장면마다 제품이 실제로 쓰이는 모습이고, 그 제품을 쓰는 사람이 할 법한 장면이다',
  },
  {
    id: 'count-reasons',
    generic: true,
    name: '이유 세 가지',
    line: '숫자를 세며 고를 이유를 하나씩 쌓는다',
    story: '훅 "○○ 하는 이유 3" → 1·2·3 장점 카드(박마다) → 합쳐진 제품 → 엔드카드',
    fits: ['혜택', '할인', '기능', '앱', '오픈', '신규', '가입', '요금제', '학원', '매장', '이벤트', '프로모션'],
    avoid: [],
    needs: '사실인 장점 3개 (사용자 자료에 있는 것만)',
    sense: '장점 셋이 모두 사용자 자료에 있고, 서로 겹치지 않는다',
    needsEvidence: ['benefits:3'],
  },
  {
    id: 'one-moment',
    generic: true,
    name: '하루의 한 순간',
    line: '시간 자막과 함께 제품이 필요한 그 순간 하나를 담는다',
    story: '훅 "오전 7:40" 같은 시간 자막 → 그 순간의 장면 → 제품이 들어오는 순간 → 기분이 바뀐 장면 → 엔드카드',
    fits: ['카페', '커피', '빵', '베이커리', '식품', '음료', '생활', '헬스', '출근', '교통', '편의점', '아침', '퇴근', '배달'],
    avoid: ['금융', '보험', '대출'],
    needs: '그 순간을 보여 줄 장면 이미지',
    sense: '그 시간·장소가 제품을 실제로 쓰는 때다(아침 커피, 퇴근길 간식처럼)',
  },
  {
    id: 'ingredient-macro',
    name: '재료·디테일 클로즈업',
    line: '재료와 질감을 아주 가까이서 보여 주며 품질을 말한다',
    story: '훅 재료 매크로(원두·과일·성분) → 만들어지거나 섞이는 순간 → 완성품 → 엔드카드',
    fits: ['커피', '원두', '빵', '베이커리', '디저트', '식품', '음식', '화장품', '스킨케어', '주얼리', '수제', '차', '와인', '맥주', '과일'],
    avoid: ['앱', '서비스', '금융', '보험', '플랫폼'],
    needs: '실제 재료·질감 사진 또는 그 재료로 만든 생성 이미지 (실제와 다른 재료 금지)',
    sense: '보여 주는 재료가 실제로 제품에 들어간 것이다',
  },
  {
    id: 'making-of',
    name: '만드는 과정',
    line: '손과 도구가 제품을 만드는 과정을 빠르게 이어 보여 준다',
    story: '훅 손이 첫 작업을 시작 → 과정 3–4컷(박마다) → 완성품 공개 → 엔드카드',
    fits: ['베이커리', '빵', '수제', '공방', '식당', '요리', '농산물', '가구', '꽃', '핸드메이드', '커피', '로스터리', '양조'],
    avoid: ['앱', '보험', '금융', '플랫폼'],
    needs: '과정 사진이나 그 과정을 보여 줄 장면',
    sense: '보여 주는 과정이 실제로 그 가게·브랜드가 하는 일이다',
  },
  {
    id: 'menu-pick',
    name: '골라 보세요',
    line: '메뉴·옵션을 카드처럼 넘기며 하나씩 보여 주고 고르게 한다',
    story: '훅 "오늘은 뭐?" → 메뉴 카드 넘김(박마다 한 장) → 대표 메뉴에서 멈춤 → 엔드카드',
    fits: ['메뉴', '신메뉴', '카페', '음료', '디저트', '식당', '쇼핑', '컬렉션', '라인업', '요금제', '옵션', '종류'],
    avoid: [],
    needs: '메뉴·옵션 2개 이상의 사진',
    sense: '실제로 고를 수 있는 메뉴·옵션이 2개 이상 있다',
    needsEvidence: ['items:2'],
  },
  {
    id: 'journey-map',
    name: '이동·경로',
    line: '출발에서 도착까지 경로가 그려지며 제품·서비스가 닿는 과정을 보여 준다',
    story: '훅 출발점 핀 → 경로가 그려짐 → 도착 장면 → 위치·시간 정보 → 엔드카드',
    fits: ['배송', '배달', '여행', '지도', '위치', '매장', '오픈', '지점', '부동산', '지역', '관광', '교통', '이사'],
    avoid: [],
    needs: '실제 위치·지역 정보',
    sense: '실제 위치·경로 정보가 있고, 이동이 광고의 장점과 이어진다(빠른 배송, 가까운 매장)',
  },
  {
    id: 'tease-reveal',
    generic: true,
    name: '감추고 공개',
    line: '실루엣·일부만 보여 주며 궁금하게 만든 뒤 마지막에 공개한다',
    story: '훅 실루엣·조각 → 힌트 2–3개 → 박 드롭에 전체 공개 → 날짜·CTA → 엔드카드',
    fits: ['신제품', '런칭', '출시', '오픈', '티저', '예고', '컬렉션', '한정', '시즌', '드롭'],
    avoid: ['병원', '보험', '금융', '공공'],
    needs: '공개할 제품 사진 (마지막 공개가 분명해야 함)',
    sense: '공개할 것이 새 제품·새 매장처럼 실제로 처음 보이는 것이다',
  },
  {
    id: 'word-play',
    name: '한 단어 반복',
    line: '핵심 단어 하나를 장면마다 다른 뜻으로 되풀이해 기억에 박는다',
    story: '훅 핵심 단어 → 같은 단어가 장면마다 다른 장면에 붙음(3번) → 브랜드와 붙음 → 엔드카드',
    fits: ['브랜드', '카페', '패션', '페스티벌', '음악', '런칭', '캠페인', '굿즈', '팝업', '감각'],
    avoid: ['병원', '의원', '금융', '보험', '대출', '법률', '공공'],
    needs: '브랜드 이름이나 슬로건에 들어간 단어',
    sense: '반복할 단어가 브랜드·제품 이름이나 장점과 바로 이어진다(아무 단어나 반복 금지)',
  },
  {
    id: 'metaphor-object',
    name: '비유 오브제',
    line: '장점 하나를 사물 하나로 바꿔 보여 주고 그 사물이 제품으로 바뀐다',
    story: '훅 비유 사물 → 그 사물이 장점처럼 움직임 → 사물이 제품으로 모프·전환 → 엔드카드',
    fits: ['브랜드', '런칭', '테크', '앱', '기술', '캠페인', '가전', '자동차', '신제품'],
    avoid: ['병원', '의원', '식품', '건강기능', '어린이', '키즈'],
    needs: '장점 한 단어와 바로 이어지는 사물 (가벼움 → 깃털처럼 누구나 아는 연결)',
    sense: '비유가 장점 한 단어로 바로 설명되고, 제품이 화면에 충분히(마지막 2초 이상) 나온다',
  },
  {
    id: 'real-voice',
    generic: true,
    name: '고객 한마디',
    line: '실제 후기·평점 한 줄을 크게 띄우고 그 장면을 보여 준다',
    story: '훅 후기 한 줄(따옴표) → 후기 속 장면 → 평점·숫자(출처 표기) → 엔드카드',
    fits: ['후기', '리뷰', '평점', '서비스', '학원', '병원', '쇼핑', '맛집', '숙소', '호텔', '매장'],
    avoid: [],
    needs: '실제 후기·평점과 출처 (지어낸 후기 금지, 협찬이면 표기, copy.md §7)',
    sense: '후기와 숫자가 모두 사용자 자료에 있다',
    needsEvidence: ['reviews'],
  },
  {
    id: 'split-compare',
    name: '나란히 비교',
    line: '화면을 둘로 나눠 예전 방식과 제품을 쓰는 방식을 나란히 보여 준다',
    story: '훅 분할 화면(왼쪽 예전, 오른쪽 제품) → 같은 동작을 양쪽에서 → 제품 쪽이 화면을 덮음 → 엔드카드',
    fits: ['앱', '가전', '도구', '서비스', '플랫폼', '자동화', '스마트', '배송', '청소'],
    avoid: ['병원', '의원', '시술'],
    needs: '두 방식을 보여 줄 장면 (경쟁사 이름·로고 금지, 예전 방식과만 비교)',
    sense: '비교 대상이 특정 회사가 아니라 예전 방식이고, 차이가 화면에서 정직하게 보인다',
  },
];

const IDEA_IDS = new Set(IDEAS.map((i) => i.id));

/** 사용자 자료가 없으면 지어낼 수밖에 없는 근거: 없으면 drawIdea가 아예 뽑지 않음 */
export const HARD_EVIDENCE = ['reviews', 'before-after'];

/** 업종 규칙: 요청 낱말이 걸리면 그 아이디어·문구는 안 씀 */
export const CATEGORY_RULES = [
  { id: 'medical', re: /병원|의원|클리닉|시술|성형|피부과|치과|한의원|의료/, avoidIdeas: ['before-after', 'metaphor-object', 'word-play', 'tease-reveal', 'product-pov', 'ingredient-macro', 'making-of', 'menu-pick', 'one-moment', 'split-compare', 'real-voice'], banned: /완치|치료 효과|부작용 없|통증 없|100\s*%|확실한 효과|보장/, note: '의료: 전후 사진·전후 비교·효과 보장·치료 경험담 금지' },
  { id: 'finance', re: /금융|은행|보험|대출|투자|증권|카드사|코인/, avoidIdeas: ['before-after', 'product-pov', 'word-play', 'one-moment', 'tease-reveal', 'ingredient-macro', 'making-of', 'metaphor-object'], banned: /수익 보장|원금 보장|무조건|확정 수익|100\s*%|손실 없|공짜/, note: '금융: 수익·원금 보장, 과장 표현 금지' },
  { id: 'health-food', re: /건강기능|영양제|다이어트|보조제/, avoidIdeas: ['before-after', 'metaphor-object'], banned: /치료|완치|예방|살 빠지|체중 감량 보장|약효|100\s*%/, note: '건강기능식품·다이어트: 질병 치료·예방, 감량 보장 표현 금지' },
  { id: 'food', re: /카페|커피|식당|음식|빵|베이커리|디저트|식품|음료|맛집|배달/, avoidIdeas: [], banned: /벌레|곰팡이|상한|더러운/, note: '식품: 불결한 비포 장면 금지(위생 연상)' },
  { id: 'kids', re: /키즈|어린이|아이|유아|초등|장난감|육아/, avoidIdeas: ['metaphor-object'], banned: /무서|공포|피\b|위험한/, note: '키즈: 어둡거나 무서운 장면 금지' },
];

/** 근거 없이 쓰면 안 되는 주장 (copy.md §7) */
const CLAIMS = /최고|최초|1위|유일|가장\s?(빠른|싼|좋은|맛있는)|100\s*%|무조건|평생|보장|완벽/;

const norm = (s) => String(s ?? '').toLowerCase();
const hitsOf = (words, text) => words.filter((w) => text.includes(norm(w)));
const ideaOf = (x) => (typeof x === 'string' ? IDEAS.find((i) => i.id === x) : x && IDEA_IDS.has(x.id) ? IDEAS.find((i) => i.id === x.id) : null);
const recentIdeas = (history, recent) => history.slice(-recent).map((h) => h?.idea).filter(Boolean);

/** 요청에 걸린 업종 규칙들 */
export function categoriesFor(request) {
  const t = String(request ?? '');
  return CATEGORY_RULES.filter((c) => c.re.test(t));
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

/** 요청에 쓸 수 있는 아이디어와 점수 (avoid·업종 규칙에 걸리면 뺌) */
export function ideasFor(request) {
  const t = norm(request);
  const cats = categoriesFor(request);
  const banned = new Set(cats.flatMap((c) => c.avoidIdeas));
  return IDEAS.filter((i) => !banned.has(i.id) && !hitsOf(i.avoid, t).length).map((i) => ({ idea: i, why: hitsOf(i.fits, t) }));
}

/**
 * 아이디어 하나 뽑기. 요청 낱말이 맞는 것 위주로, 최근 광고(recent편)·같은 목록(exclude)에서 쓴 것은 남는 게 있으면 피한다.
 * @returns {{ id, name, line, story, needs, sense, why: string[] }}
 */
export function drawIdea({ request, history = [], exclude = [], seed, recent = 4, evidence = [] } = {}) {
  const r = rng(Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2 ** 31));
  let pool = ideasFor(request);
  if (!pool.length) pool = IDEAS.filter((i) => !i.avoid.length).map((idea) => ({ idea, why: [] }));
  // 후기·전후 사진이 있어야 하는 아이디어는 사용자가 그 자료가 있다고 했을 때만(evidence에 'reviews'·'before-after')
  pool = pool.filter((p) => !(p.idea.needsEvidence ?? []).some((n) => HARD_EVIDENCE.includes(n) && !evidence.includes(n)));
  const taken = new Set(exclude.map((x) => (typeof x === 'string' ? x : x?.id)).filter(Boolean));
  const notTaken = pool.filter((p) => !taken.has(p.idea.id));
  if (notTaken.length) pool = notTaken;
  const last = new Set(recentIdeas(history, recent));
  const fresh = pool.filter((p) => !last.has(p.idea.id));
  if (fresh.length) pool = fresh;
  // 낱말이 맞는 아이디어가 있으면 그중에서(맞을수록 자주), 없으면 어느 업종에나 쓰는 기본 후보에서
  const fit = pool.filter((p) => p.why.length);
  const generic = pool.filter((p) => p.idea.generic);
  if (fit.length) pool = fit;
  else if (generic.length) pool = generic;
  const w = pool.map((p) => 1 + p.why.length * 2);
  let x = r() * w.reduce((s, v) => s + v, 0);
  const pick = pool.find((_, i) => (x -= w[i]) < 0) ?? pool[pool.length - 1];
  const { id, name, line, story, needs, sense } = pick.idea;
  return { id, name, line, story, needs, sense, why: pick.why };
}

/**
 * 아이디어가 말이 되는지 검사. 기계로 볼 수 있는 것은 problems에, 사람이(Claude가) 답해야 하는 것은 questions에.
 * problems가 하나라도 있으면 아이디어나 문구를 바꾼다.
 * @param {object} o
 * @param {string} o.request  요청 문장
 * @param {string|object} o.idea  아이디어 id 또는 drawIdea 결과
 * @param {string} o.logline  한 문장 로그라인 (누가·무엇을·왜, 60자 안팎)
 * @param {string} [o.product]  제품·브랜드 이름
 * @param {string[]} [o.benefits]  장점 (사용자 자료에 있는 것)
 * @param {string[]} [o.copy]  화면 문구·내레이션
 * @param {string[]} [o.evidence]  사용자 자료에 있는 근거 종류: 'before-after' | 'reviews' | 'claims' 그리고 메뉴·옵션 수는 'items:3'처럼
 */
export function checkConcept({ request = '', idea, logline = '', product = '', benefits = [], copy = [], evidence = [] } = {}) {
  const problems = [];
  const it = ideaOf(idea);
  const t = norm(request);
  const cats = categoriesFor(request);
  if (idea && !it) problems.push(`모르는 아이디어 "${typeof idea === 'string' ? idea : idea?.id}" (references/ideas.md)`);
  if (it) {
    const hit = hitsOf(it.avoid, t);
    if (hit.length) problems.push(`"${it.name}"은 ${hit.join('·')} 광고에 쓰지 않습니다`);
    for (const c of cats) if (c.avoidIdeas.includes(it.id)) problems.push(`"${it.name}"은 ${c.note.split(':')[0]} 광고에 쓰지 않습니다 (${c.note})`);
    for (const need of it.needsEvidence ?? []) {
      const [kind, n] = need.split(':');
      if (kind === 'benefits') {
        if (benefits.length < Number(n)) problems.push(`"${it.name}"은 사용자 자료의 장점이 ${n}개 필요합니다 (지금 ${benefits.length}개)`);
      } else if (kind === 'items') {
        const have = Math.max(0, ...evidence.map((e) => (String(e).startsWith('items:') ? Number(String(e).split(':')[1]) : 0)));
        if (have < Number(n)) problems.push(`"${it.name}"은 고를 메뉴·옵션이 ${n}개 이상 필요합니다 (evidence에 'items:${n}'처럼)`);
      } else if (!evidence.includes(kind)) problems.push(`"${it.name}"은 실제 자료(${kind === 'reviews' ? '후기·평점과 출처' : '같은 대상의 전·후 사진'})가 있어야 합니다`);
    }
  }
  const line = String(logline).trim();
  if (!line) problems.push('로그라인 한 문장이 없습니다 (누가·무엇을·왜)');
  else {
    if (line.length > 80) problems.push(`로그라인이 ${line.length}자입니다 (한 문장, 60자 안팎)`);
    if (product && !norm(line).includes(norm(product))) problems.push(`로그라인에 제품 "${product}"가 없습니다`);
    if (benefits.length && !benefits.some((b) => norm(line).includes(norm(b)))) problems.push('로그라인에 장점이 하나도 없습니다 (benefits 중 하나를 넣음)');
  }
  const texts = [line, ...copy].filter(Boolean);
  for (const c of cats) for (const s of texts) if (c.banned.test(s)) problems.push(`"${s}" — ${c.note}`);
  if (!evidence.includes('claims')) for (const s of texts) if (CLAIMS.test(s)) problems.push(`"${s}" — 최상급·보장 표현은 근거(출처)가 있을 때만 (copy.md §7, 근거가 있으면 evidence에 'claims')`);
  const questions = [
    '제품을 빼고 다른 제품을 넣어도 이 이야기가 그대로 말이 되나요? 그렇다면 이 제품만의 장면이 없으니 바꿉니다.',
    '장면마다 사용자 사진·자료 중 무엇에 근거하나요? 근거 없는 장면(지어낸 장소·인물·결과)은 뺍니다.',
    it ? `말이 되는 조건: ${it.sense}` : '이 아이디어가 장점 한 단어와 바로 이어지나요?',
    '이 업종의 시청자가 보고 어색하거나 불쾌할 장면(위생, 신뢰, 과장, 아이에게 무서운 장면)이 있나요?',
  ];
  return { ok: !problems.length, problems: [...new Set(problems)], questions, ...(cats.length ? { categories: cats.map((c) => c.id) } : {}) };
}

/**
 * 방향 순위를 최근 기록으로 다시 매긴다(점수 크기와 상관없이). 최근 2편에 쓴 방향은 낱말 점수를 0(기본 후보 수준)으로,
 * 3–4편 전에 쓴 방향은 절반으로 낮춘다. 점수가 같으면 최근 8편에 덜 쓴 방향이 앞(같은 업종 요청에도 1번이 돌아가며 바뀜).
 * 빠지지는 않으니 3개 안에는 여전히 들 수 있다.
 * @param {{ d: { id: string, isDefault?: boolean }, score: number, why: string[] }[]} ranked
 * @param {object[]} history  { direction } 기록, 최근 것이 뒤
 */
export function rerankDirections(ranked, history = []) {
  const last = history.map((h) => h?.direction).filter(Boolean);
  const recent2 = new Set(last.slice(-2));
  const recent4 = new Set(last.slice(-4));
  const count = (id) => last.slice(-8).filter((x) => x === id).length;
  // 어울림 낱말이 맞은 방향(fit)은 최근에 썼어도 맞지 않은 방향보다 앞: 돌려쓰기는 어울리는 방향 안에서만
  // (최근 2편 = 어울리는 방향 중 맨 뒤, 3–4편 = 점수 절반)
  return ranked
    .map((r) => {
      let score = r.score;
      if (score > 0 && recent2.has(r.d.id)) score = score * 0.01;
      else if (score > 0 && recent4.has(r.d.id)) score = score / 2;
      return { ...r, score, fit: score > 0 && (r.why?.length ?? 0) > 0, used: count(r.d.id) };
    })
    .sort((a, b) => Number(b.fit) - Number(a.fit) || b.score - a.score || a.used - b.used || Number(b.d.isDefault) - Number(a.d.isDefault));
}

/** 예시 고르기: 최근 기록에 쓴 예시(history[].example)는 다른 예시가 있으면 뒤로 */
export function rotateExamples(ids, history = [], recent = 4) {
  const last = new Set(history.slice(-recent).map((h) => h?.example).filter(Boolean));
  return [...ids.filter((id) => !last.has(id)), ...ids.filter((id) => last.has(id))];
}

/** 씬표 맨 위에 붙일 글 */
export function ideaText(idea) {
  return [`아이디어: ${idea.name} (${idea.id})`, `- ${idea.line}`, `- 이야기: ${idea.story}`, `- 필요한 것: ${idea.needs}`, `- 말이 되는 조건: ${idea.sense}`].join('\n');
}
