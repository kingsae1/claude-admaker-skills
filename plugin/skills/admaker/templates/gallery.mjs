// 예시 갤러리: 요청과 가까운 예시를 골라 미리보기 페이지로 보여 주고(recommend), 고른 예시의 빌드 키트를 프로젝트에 복사한다(use).
// 사용:
//   node gallery.mjs list
//   node gallery.mjs recommend "9:16 배송 광고, 지도에 경로가 그려지고 플래시 전환" [--top 3] [--out gallery-preview.html]
//   node gallery.mjs refs "카드 스택 3d" [--refs 12]     # 외부 레퍼런스(shotcraft 샷 124 · opuscar 스타일 66) 검색
//   node gallery.mjs use <slug> [프로젝트 폴더]
//   node gallery.mjs directions                         # 모션 방향 메뉴(references/motion-directions.md) 목록
// recommend는 언제나 기획안 3개(모션 방향: 형태·골격·시그니처·전환, 기획안마다 "이런 형태로" 예시 하나)와 "자유롭게 생성"을 먼저 보여 주고, 그 아래 예시와 외부 레퍼런스를 붙인다.
// 갤러리 위치: --gallery <폴더> > GALLERY_DIR > 이 파일 기준 ../gallery > ./gallery
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { drawCard } from "./variety-core.mjs";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const galleryArg = flag("gallery");
const top = Number(flag("top", 3));
const outArg = flag("out", "gallery-preview.html");
const refTop = Number(flag("refs", 6));
const [cmd, ...rest] = args;

const here = path.dirname(fileURLToPath(import.meta.url));
const GALLERY = [galleryArg, process.env.GALLERY_DIR, path.join(here, "../gallery"), path.resolve("gallery")]
  .filter(Boolean)
  .find((d) => fs.existsSync(path.join(d, "data/ads.json")));
if (!GALLERY) {
  console.error("갤러리를 찾지 못했습니다. --gallery <스킬 폴더>/gallery 를 주세요");
  process.exit(1);
}
const SKILL = path.dirname(GALLERY);
const ADS = JSON.parse(fs.readFileSync(path.join(GALLERY, "data/ads.json"), "utf8"));
// 외부 레퍼런스 색인(shotcraft 샷 카드 · opuscar 스타일): 빌드 키트는 없고, 연출을 고를 때 참고할 후보
const REFS_FILE = path.join(GALLERY, "data/references.json");
const REFS = fs.existsSync(REFS_FILE) ? JSON.parse(fs.readFileSync(REFS_FILE, "utf8")) : { items: [], sources: {} };

// 모션 방향 메뉴: references/motion-directions.md 의 "## <id> · <이름>" 절과 "- 줄: 값" 줄을 읽는다
const DIR_FILE = [path.join(SKILL, "references/motion-directions.md"), path.join(here, "../references/motion-directions.md")].find((f) => fs.existsSync(f));
const FIELD = { "한 줄": "line", 형태: "form", 골격: "skeleton", 시그니처: "signature", 전환: "transitions", "글꼴·색": "look", 어울림: "fits", 예시: "examples", "레퍼런스 낱말": "refWords", 앱: "app", 기본: "isDefault" };
const DIRECTIONS = (() => {
  if (!DIR_FILE) return [];
  const out = [];
  let cur = null;
  for (const raw of fs.readFileSync(DIR_FILE, "utf8").split("\n")) {
    const h = raw.match(/^## ([a-z0-9-]+) · (.+)$/);
    if (h) { cur = { id: h[1], name: h[2].trim() }; out.push(cur); continue; }
    const f = cur && raw.match(/^- ([^:]+): (.*)$/);
    if (f && FIELD[f[1].trim()]) cur[FIELD[f[1].trim()]] = f[2].trim();
  }
  for (const d of out) {
    d.fitWords = (d.fits ?? "").split("/").map((w) => w.trim().toLowerCase()).filter(Boolean);
    d.exampleIds = (d.examples ?? "").split(",").map((w) => w.trim()).filter((w) => w && w !== "-");
    d.isDefault = /^예/.test(d.isDefault ?? "");
  }
  return out;
})();

/** 방향 점수: 어울림 낱말이 요청에 들어 있으면 +2, 기법 낱말(KEYWORDS)이 방향의 골격·전환에 걸리면 +1 */
function scoreDirection(d, text) {
  const t = text.toLowerCase();
  const hits = d.fitWords.filter((w) => t.includes(w));
  let s = hits.length * 2;
  const body = `${d.skeleton} ${d.transitions} ${d.signature}`.toLowerCase();
  for (const [re, tags] of KEYWORDS) if (re.test(text) && tags.some((x) => !x.startsWith("cat:") && body.includes(x.replace("kinetic-typography", "kinetic").replace("countUp", "countup")))) s += 1;
  // 손글씨 감성은 사용자가 그 낱말을 썼을 때만 (가는 선·부드러운 연출은 기본이 아님)
  if (d.id === "handwritten-warm" && !hits.length) s = -1;
  return { d, score: s, why: hits };
}

/** 언제나 방향 3개: 맞는 것부터, 모자라면 기본 방향으로 채움 */
function pickDirections(text, n = 3) {
  const ranked = DIRECTIONS.map((d) => scoreDirection(d, text)).sort((a, b) => b.score - a.score || Number(b.d.isDefault) - Number(a.d.isDefault));
  const out = ranked.filter((r) => r.score > 0).slice(0, n);
  for (const r of ranked) if (out.length < n && !out.includes(r) && r.d.isDefault) out.push(r);
  for (const r of ranked) if (out.length < n && !out.includes(r) && r.score >= 0) out.push(r);
  return out;
}

// 요청 문장의 낱말 → 기법·카테고리 태그
const KEYWORDS = [
  [/전환|트랜지션|transition|컷.?잇/i, ["cat:transition"]],
  [/플래시|번쩍|flash/i, ["flash"]],
  [/덮|커버|cover|flood/i, ["cover"]],
  [/줌|zoom|빨려/i, ["zoom-through"]],
  [/매치|match/i, ["match-cut"]],
  [/카드.?(전환|넘김)|차원|dimension/i, ["dimension"]],
  [/밀|스와이프|swipe|push|와이프|wipe/i, ["swipe"]],
  [/지도|map|경로|route|배송|위치|지역/i, ["cat:map", "map"]],
  [/3d|입체|three|제품.?회전|오브젝트/i, ["cat:3d", "three"]],
  [/모프|모핑|morph|변신|변형|평면화|2d로/i, ["morph"]],
  [/gsap|펀치|칩/i, ["gsapTimeline"]],
  [/손글씨|필기|handwrit|감성|캘리/i, ["cat:typography", "handwriting", "strokeDraw"]],
  [/타이포|키네틱|kinetic|문구.?강조|비트/i, ["kinetic-typography"]],
  [/통통|바운스|bounce|squash|로딩/i, ["squash-stretch"]],
  [/아이소|isometric|도시|블록/i, ["isometric"]],
  [/리퀴드|액체|liquid|메타볼|blob/i, ["metaball"]],
  [/파티클|입자|particle|로고.?모이/i, ["particles"]],
  [/숫자|카운트|가격|count/i, ["countUp"]],
  [/모션.?스타일|여러.?스타일|쇼릴|reel/i, ["cat:motion"]],
];

// 레퍼런스(references.json) 태그용 낱말 사전: 요청 낱말 → 영문 태그
const REF_WORDS = [
  [/전환|트랜지션|transition/i, ["transition"]], [/와이프|wipe|밀어/i, ["wipe", "push", "swipe"]], [/플래시|번쩍|flash/i, ["flash"]],
  [/줌|zoom|급줌|펀치/i, ["zoom", "punch"]], [/카메라|운경|패럴랙스|parallax|깊이/i, ["camera", "parallax", "depth"]],
  [/3d|입체|three|공간/i, ["3d"]], [/카드|card/i, ["cards", "card"]], [/스택|쌓/i, ["stack"]], [/캐러셀|회전목마|carousel/i, ["carousel"]],
  [/타이포|글자|문구|키네틱|kinetic|타이틀|제목/i, ["kinetic-typography", "title"]], [/타자|타이핑|typewriter/i, ["typewriter", "typing"]],
  [/슬롯|롤러|단어.?교체/i, ["slot", "roll"]], [/마키|흐르는.?글자|marquee/i, ["marquee"]], [/밑줄|강조|하이라이트/i, ["underline", "annotation", "highlight"]],
  [/손그림|손글씨|핸드|드로잉|hand/i, ["hand-drawn", "handwriting", "strokeDraw"]], [/선.?그리|라인|strokeDraw/i, ["strokeDraw", "lines"]],
  [/숫자|카운트|가격|통계|데이터|차트|data/i, ["countUp", "data", "chart", "numbers", "price"]], [/로고|워드마크|브랜드|엔드카드|logo/i, ["logo", "outro", "lockup"]],
  [/오프닝|인트로|훅|opening/i, ["opening"]], [/마무리|아웃트로|outro/i, ["outro"]], [/비트|박자|리듬|몽타주|beat/i, ["beat", "montage", "rhythm"]],
  [/글로우|빛|광|네온|glow|neon|light/i, ["glow", "neon", "light", "sweep"]], [/그라데이션|gradient/i, ["gradient"]], [/파티클|입자|particle/i, ["particles"]],
  [/글리치|glitch/i, ["glitch"]], [/분할|split|격자|그리드|grid/i, ["split-screen", "grid"]], [/ui|앱|화면|인터페이스|대시보드/i, ["ui"]],
  [/모던|요즘|트렌디|세련|modern/i, ["modern", "minimal", "kinetic-typography", "3d", "glow"]], [/미니멀|스위스|minimal|swiss/i, ["minimal", "swiss", "grid"]],
  [/레트로|빈티지|옛날|retro/i, ["retro"]], [/프리미엄|럭셔리|고급|premium|luxury/i, ["premium", "luxury", "glass", "gold"]],
  [/제품|product/i, ["product"]], [/유리|glass/i, ["glass"]], [/종이|페이퍼|paper/i, ["paper"]], [/인쇄|리소|판화|print/i, ["print", "riso"]],
  [/아이소|isometric/i, ["isometric"]], [/지도|map|노선/i, ["map", "transit-map"]], [/어둡|다크|dark/i, ["dark"]], [/게임|game|픽셀/i, ["game", "pixel"]],
  [/뉴스|news/i, ["news"]], [/동양|한국적|전통|수묵/i, ["east-asian", "ink-wash"]], [/만화|카툰|애니|cartoon|anime/i, ["cartoon", "anime"]],
  [/커피|카페|음료|푸드|food|coffee/i, ["product", "premium", "glass", "kinetic-typography"]],
];

/** 레퍼런스 점수: 태그 일치 + 한국어 요약·admaker 힌트 낱말 일치 */
function scoreRef(ref, text) {
  const want = new Set();
  for (const [re, t] of REF_WORDS) if (re.test(text)) t.forEach((x) => want.add(x));
  const hitTags = ref.tags.filter((t) => want.has(t));
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
  const hay = `${ref.title} ${ref.summary_ko} ${ref.admaker} ${ref.category_ko}`.toLowerCase();
  const hits = words.filter((w) => hay.includes(w));
  return { ref, score: hitTags.length * 2 + Math.min(3, hits.length), why: [...hitTags, ...hits.map((w) => `"${w}"`)] };
}

/** 요청에 맞는 레퍼런스: 같은 출처·카테고리가 몰리지 않게 카테고리당 2개까지 */
function pickRefs(text, n) {
  const ranked = REFS.items.map((r) => scoreRef(r, text)).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  const per = new Map(), out = [];
  for (const r of ranked) {
    const k = `${r.ref.source}:${r.ref.category}`;
    if ((per.get(k) ?? 0) >= 2) continue;
    per.set(k, (per.get(k) ?? 0) + 1);
    out.push(r);
    if (out.length >= n) break;
  }
  return out;
}

function score(item, text) {
  const tags = new Set();
  for (const [re, t] of KEYWORDS) if (re.test(text)) t.forEach((x) => tags.add(x));
  let s = 0;
  const why = [];
  for (const t of tags) {
    if (t.startsWith("cat:") && item.category === t.slice(4)) (s += 2), why.push(`카테고리 ${item.category}`);
    else if ((item.techniques ?? []).includes(t)) (s += 3), why.push(`기법 ${t}`);
  }
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
  const hay = `${item.title} ${item.prompt} ${(item.shots ?? []).join(" ")}`.toLowerCase();
  const hits = words.filter((w) => hay.includes(w));
  s += Math.min(3, hits.length * 0.5);
  if (/9:16|세로|숏폼|릴스|쇼츠/.test(text) && item.aspect === "9:16") s += 0.5;
  return { item, score: s, why: [...new Set(why)] };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const previewData = (slug) => {
  const f = path.join(GALLERY, "previews", `${slug}.webp`);
  return fs.existsSync(f) ? `data:image/webp;base64,${fs.readFileSync(f).toString("base64")}` : "";
};

/** 기획안마다 "이런 형태로"를 보여 줄 예시 하나: 우리 갤러리 예시(같은 예시는 한 기획안에만) → 방향에 적힌 레퍼런스 → 고른 레퍼런스 */
function planExamples(dirs) {
  const used = new Set();
  return dirs.map(({ d, refs = [] }) => {
    const ad = d.exampleIds.map((id) => ADS.find((a) => a.slug === id)).find((a) => a && !used.has(a.slug));
    if (ad) {
      used.add(ad.slug);
      return { kind: "ad", id: ad.slug, title: ad.title, preview: ad.preview_url ?? "", previewType: "image", appImport: ad.app_import, item: ad };
    }
    const r = [...d.exampleIds.map((id) => REFS.items.find((x) => x.id === id)), ...refs.map((x) => x.ref)].find((x) => x && !used.has(x.id));
    if (r) {
      used.add(r.id);
      return { kind: "ref", id: r.id, title: r.title, preview: r.preview ?? "", previewType: r.preview_type === "video" ? "video" : "image", ref: r };
    }
    return null;
  });
}

const PLAN = (i) => `기획안 ${String.fromCharCode(65 + i)}`;

function directionCards(dirs) {
  const examples = planExamples(dirs);
  return dirs
    .map(({ d, why, refs, variety }, i) => {
      const ex = examples[i];
      const local = ex?.kind === "ad" ? previewData(ex.id) : "";
      const media = local
        ? `<img src="${local}" alt="${esc(ex.title)} 미리보기">`
        : ex?.preview
          ? ex.previewType === "video"
            ? `<video src="${esc(ex.preview)}" muted loop autoplay playsinline preload="metadata"></video>`
            : `<img src="${esc(ex.preview)}" alt="${esc(ex.title)}" loading="lazy">`
          : `<div class="noimg">예시 없음</div>`;
      return `<article>
  <div class="media">${media}</div>
  <div class="body">
    <p class="rank">${i + 1}. ${PLAN(i)}${i === 0 ? " · 추천" : ""}${why.length ? ` · ${esc(why.join(", "))}` : " · 기본 후보"}</p>
    <h2>${esc(d.name)}</h2>
    <p>${esc(d.line)}</p>
    <h3>형태</h3><p class="meta">${esc(d.form)}</p>
    <h3>골격</h3><p class="meta">${esc(d.skeleton)}</p>
    <h3>시그니처 · 전환</h3><p class="meta">${esc(d.signature)} · ${esc(d.transitions)}</p>
    <p class="meta">글꼴·색: ${esc(d.look)} · 앱: ${esc(d.app)}</p>
    ${variety ? `<h3>변주 카드</h3><p class="meta">${esc(variety.summary)}</p>` : ""}
    ${ex ? `<p class="meta">예시(이런 형태로): ${ex.kind === "ad" ? `<code>${esc(ex.id)}</code> ${esc(ex.title)}${ex.appImport === "partial" ? " · 앱에서 일부 빠짐" : ""}` : `레퍼런스 <a href="${esc(ex.ref.source_url)}">${esc(ex.title)}</a>`}</p>` : ""}
    ${refs.length ? `<p class="meta">더 볼 레퍼런스: ${refs.map(({ ref }) => `<a href="${esc(ref.source_url)}">${esc(ref.title)}</a>`).join(" · ")}</p>` : ""}
    <p class="pick">고르려면: <code>${i + 1}번</code> 또는 <code>${esc(d.id)}</code></p>
  </div>
</article>`;
    })
    .join("\n") + `
<article>
  <div class="media"><div class="noimg">정해 둔 예시 없음</div></div>
  <div class="body">
    <p class="rank">${dirs.length + 1}. 자유롭게 생성</p>
    <h2>자유롭게 생성</h2>
    <p>정해 둔 방향·예시에 묶지 않고 브리프·소재·음악만 보고 새 구성을 짭니다(방향을 섞거나 메뉴에 없는 형태).</p>
    <p class="pick">고르려면: <code>${dirs.length + 1}번</code> 또는 <code>자유</code></p>
  </div>
</article>`;
}

function page(request, recs, refs = [], dirs = []) {
  const cards = recs
    .map(({ item, why }, i) => {
      const img = previewData(item.slug);
      return `<article>
  <div class="media">${img ? `<img src="${img}" alt="${esc(item.title)} 미리보기">` : `<div class="noimg">미리보기 없음</div>`}</div>
  <div class="body">
    <p class="rank">추천 ${i + 1}${why.length ? ` · ${esc(why.join(", "))}` : ""}</p>
    <h2>${esc(item.title)}</h2>
    <p class="meta">${esc(item.duration)}초 · ${esc(item.aspect)} · 샷 카드 ${esc((item.shots ?? []).join(", "))}</p>
    <h3>이 예시에서 바꿔 쓸 자리</h3>
    <ul>${(item.slots ?? []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    <details><summary>예시 프롬프트 (영문)</summary><p class="prompt">${esc(item.prompt)}</p></details>
    <p class="pick">고르려면: <code>${esc(i + 1)}번</code> 또는 <code>${esc(item.slug)}</code></p>
  </div>
</article>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>모션 추천</title>
<style>
:root{--bg:#f6f6f4;--card:#fff;--fg:#1b1b1f;--muted:#66666e;--line:#e3e3e0;--accent:#3b6cff}
@media (prefers-color-scheme:dark){:root{--bg:#121214;--card:#1c1c20;--fg:#ededf0;--muted:#a0a0a8;--line:#2c2c32;--accent:#7a9bff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Apple SD Gothic Neo","Pretendard",sans-serif}
main{max-width:1080px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:22px;margin:0 0 4px}.req{color:var(--muted);margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
article{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.media{background:#000;display:flex;justify-content:center}.media img,.media video{width:180px;max-width:100%;display:block}.media video{width:100%;max-height:320px;object-fit:contain}.refs-h{margin-top:36px}a{color:var(--accent)}
.noimg{color:#888;padding:60px 0}.body{padding:14px 16px 16px}
.rank{color:var(--accent);font-size:12px;font-weight:600;margin:0}h2{font-size:17px;margin:4px 0}
.meta{color:var(--muted);font-size:13px;margin:0 0 8px}h3{font-size:13px;margin:10px 0 4px}
ul{margin:0;padding-left:18px;font-size:13px}.prompt{font-size:12px;color:var(--muted)}
summary{cursor:pointer;font-size:13px;margin-top:8px}.pick{font-size:13px;margin:12px 0 0}code{background:var(--line);padding:1px 5px;border-radius:4px}
</style></head><body><main>
<h1>이렇게 만들어 볼까요?</h1>
<p class="req">요청: ${esc(request)}</p>
${dirs.length ? `<p class="req">기획안 3개와 자유롭게 생성: 바닥 소재 위에 어떤 모션그래픽을 어떤 형태로 얹을지입니다. 기획안마다 붙은 예시가 그 형태입니다. 하나를 고르면 그 골격으로 샷을 짭니다.</p>
<div class="grid">
${directionCards(dirs)}
</div>
<h1 class="refs-h">빌드 키트가 있는 예시</h1>
<p class="req">예시처럼 만들고 싶으면 키트를 복사해 출발점으로 씁니다(<code>gallery.mjs use &lt;slug&gt;</code>).</p>` : ""}
<div class="grid">
${cards}
</div>
${refs.length ? `<h1 class="refs-h">더 넓게 보기: 외부 레퍼런스 ${refs.length}개</h1>
<p class="req">빌드 키트는 없고, 샷 카드로 새로 짤 때 섞어 쓸 연출 후보입니다. 미리보기는 원 저장소에서 불러옵니다(인터넷 필요).</p>
<div class="grid">
${refs.map(({ ref, why }, i) => `<article>
  <div class="media">${ref.preview ? (ref.preview_type === "video" ? `<video src="${esc(ref.preview)}" muted loop autoplay playsinline preload="metadata"></video>` : (ref.demo ? `<a href="${esc(ref.demo.video)}" title="데모 영상 재생"><img src="${esc(ref.preview)}" alt="${esc(ref.title)}" loading="lazy"></a>` : `<img src="${esc(ref.preview)}" alt="${esc(ref.title)}" loading="lazy">`)) : `<div class="noimg">미리보기 없음</div>`}</div>
  <div class="body">
    <p class="rank">레퍼런스 ${String.fromCharCode(65 + i)} · ${esc(REFS.sources?.[ref.source] ? ref.source : ref.source)} · ${esc(ref.category_ko)}${why.length ? ` · ${esc(why.slice(0, 4).join(", "))}` : ""}</p>
    <h2>${esc(ref.title)}</h2>
    <p>${esc(ref.summary_ko)}</p>
    <h3>admaker로 만들면</h3>
    <p class="meta">${esc(ref.admaker)}</p>
    ${ref.demo ? `<p class="meta"><a href="${esc(ref.demo.video)}">▶ 데모 영상: ${esc(ref.demo.title)} (${Math.round(ref.demo.duration)}초, 약 ${ref.demo.size_mb}MB)</a></p>` : ""}
    <p class="pick"><a href="${esc(ref.source_url)}">원문 (${esc(REFS.sources?.[ref.source]?.license ?? "")})</a> · 고르려면 <code>${esc(String.fromCharCode(65 + i))}</code> 또는 <code>${esc(ref.id)}</code></p>
  </div>
</article>`).join("\n")}
</div>` : ""}
</main></body></html>
`;
}

function copyKit(item, dir) {
  const kit = item.kit;
  if (!kit) throw new Error(`${item.slug}: 빌드 키트가 없습니다`);
  const src = path.join(SKILL, kit.dir);
  fs.mkdirSync(dir, { recursive: true });
  const copied = [];
  const walk = (from, rel = "") => {
    for (const e of fs.readdirSync(path.join(from, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) walk(from, r);
      else {
        const to = path.join(dir, r);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        if (kit.kind !== "script" && r === kit.entry) continue; // timeline은 아래에서 합친다
        fs.copyFileSync(path.join(from, r), to);
        copied.push(r);
      }
    }
  };
  walk(src);
  if (kit.kind === "timeline-section" || kit.kind === "timeline-full") {
    const target = path.join(dir, "timeline.mjs");
    const sample = fs.readFileSync(path.join(src, kit.entry), "utf8");
    if (fs.existsSync(target)) fs.copyFileSync(target, path.join(dir, "timeline.before-gallery.mjs"));
    let out = sample;
    if (kit.kind === "timeline-section") {
      if (!fs.existsSync(target)) throw new Error("timeline.mjs가 없습니다. templates/를 먼저 프로젝트에 복사하세요");
      const cur = fs.readFileSync(target, "utf8");
      const at = cur.indexOf("// 섹션:");
      if (at < 0) throw new Error('timeline.mjs에서 "// 섹션:" 줄을 찾지 못했습니다');
      out = cur.slice(0, at) + sample;
    }
    fs.writeFileSync(target, out);
    copied.push(`timeline.mjs (${kit.kind === "timeline-section" ? "섹션 이하 교체" : "전체 교체"}, 원본은 timeline.before-gallery.mjs)`);
  }
  return copied;
}

const bySlug = (s) => ADS.find((a) => a.slug === s);

if (cmd === "list" || !cmd) {
  for (const a of ADS) console.log(`${a.slug.padEnd(28)} ${a.category.padEnd(11)} ${a.duration}s ${a.aspect}  ${a.title}`);
} else if (cmd === "recommend") {
  const request = rest.join(" ").trim();
  if (!request) throw new Error('요청 문장을 주세요: node gallery.mjs recommend "..."');
  const ranked = ADS.map((a) => score(a, request)).sort((x, y) => y.score - x.score);
  // 맞는 기법·카테고리가 없는 예시는 빼고, 하나도 안 맞으면 앞에서 top개
  const dirs = pickDirections(request).map((r) => ({ ...r, refs: pickRefs(`${request} ${r.d.refWords ?? ""}`, 2) }));
  // 변주 카드: 기획안마다 한 장, 최근 광고 기록(variety.mjs와 같은 파일)과 다른 기획안의 카드를 피해서 뽑는다 (references/variety.md)
  const history = (() => {
    try {
      return JSON.parse(fs.readFileSync(process.env.ADMAKER_VARIETY_HISTORY ?? path.join(os.homedir(), ".admaker", "variety-history.json"), "utf8")).items ?? [];
    } catch {
      return [];
    }
  })();
  const cards = [];
  for (const r of dirs) cards.push((r.variety = drawCard({ direction: r.d.id, history, exclude: cards, request })));
  const freeCard = drawCard({ direction: "free", history, exclude: cards, request });
  const cardsFile = path.join(path.dirname(path.resolve(outArg)), "variety-cards.json");
  fs.writeFileSync(cardsFile, JSON.stringify({ plans: cards, free: freeCard }, null, 2));
  const fit = ranked.filter((r) => r.why.length);
  // 기법이 맞는 예시가 없으면 고른 방향의 예시를 먼저, 그다음 가까운 순
  const fromDirs = [...new Set(dirs.flatMap(({ d }) => d.exampleIds))].map((id) => ranked.find((r) => r.item.slug === id)).filter(Boolean);
  const recs = (fit.length ? fit : [...new Set([...fromDirs, ...ranked])]).slice(0, top);
  if (!fit.length) console.log("요청에 기법 낱말이 없어 예시는 모션 방향에 가까운 순으로 보여 줍니다");
  const refs = pickRefs(request, refTop);
  fs.writeFileSync(outArg, page(request, recs, refs, dirs));
  if (dirs.length) {
    const examples = planExamples(dirs);
    console.log("기획안 (사용자에게 이 4줄을 번호 목록 하나로 보여 줌, 1번 추천):");
    dirs.forEach(({ d, why }, i) => {
      const ex = examples[i];
      const exLine = ex
        ? `\n     예시(이런 형태로): ${ex.kind === "ad" ? `${ex.title} [${ex.id}]${ex.appImport === "partial" ? " · 앱에서 일부 빠짐" : ""}` : `레퍼런스 ${ex.title} [${ex.id}]`}${ex.preview ? `\n     미리보기: ${ex.preview}` : ""}`
        : "\n     예시: 없음";
      console.log(`${i + 1}. ${PLAN(i)} · ${d.name} (${d.id})${i === 0 ? " (추천)" : ""}${why.length ? ` — ${why.join(", ")}` : " — 기본 후보"}\n     ${d.line}\n     형태: ${d.form}\n     골격: ${d.skeleton}\n     시그니처: ${d.signature}\n     전환: ${d.transitions}${exLine}\n     변주: ${dirs[i].variety.summary}`);
    });
    console.log(`${dirs.length + 1}. 자유롭게 생성 — 정해 둔 방향·예시에 묶지 않고 브리프만 보고 새 구성을 짬\n     변주: ${freeCard.summary}`);
    console.log(`변주 카드 전문: ${cardsFile} (고른 기획안의 카드를 씬표 맨 위에, 고른 바로 그때 variety.mjs record)`);
    console.log("빌드 키트가 있는 예시:");
  } else console.log("references/motion-directions.md 를 찾지 못해 모션 방향 없이 예시만 보여 줍니다");
  recs.forEach(({ item, score: s, why }, i) => console.log(`${i + 1}. ${item.slug} (${s.toFixed(1)}) ${item.title}${why.length ? ` — ${why.join(", ")}` : ""}`));
  refs.forEach(({ ref, score: s }, i) => console.log(`${String.fromCharCode(65 + i)}. ${ref.id} (${s.toFixed(1)}) ${ref.summary_ko}\n     admaker: ${ref.admaker}${ref.demo ? `\n     데모: ${ref.demo.video}` : ""}`));
  console.log(`→ ${path.resolve(outArg)}`);
} else if (cmd === "refs") {
  // 외부 레퍼런스 검색: node gallery.mjs refs "카드 스택 3d" [--refs 12]
  const q = rest.join(" ").trim();
  const list = q ? pickRefs(q, refTop) : REFS.items.map((ref) => ({ ref, score: 0 }));
  for (const { ref, score: s } of list) console.log(`${ref.id.padEnd(44)} ${q ? `(${s.toFixed(1)}) ` : ""}${ref.summary_ko}\n${" ".repeat(46)}admaker: ${ref.admaker}${ref.demo ? `\n${" ".repeat(46)}데모: ${ref.demo.title} (${Math.round(ref.demo.duration)}초) ${ref.demo.video}` : ""}`);
  console.log(`${list.length}개 / 전체 ${REFS.items.length}개 (shotcraft 샷 ${REFS.items.filter((r) => r.source === "shotcraft").length}, opuscar 스타일 ${REFS.items.filter((r) => r.source === "opuscar").length})`);
} else if (cmd === "directions") {
  for (const d of DIRECTIONS) console.log(`${d.id.padEnd(20)} ${d.name}${d.isDefault ? " (기본)" : ""}\n${" ".repeat(21)}${d.line}`);
} else if (cmd === "use") {
  const [slug, dir = "."] = rest;
  const item = bySlug(slug);
  if (!item) throw new Error(`없는 예시: ${slug} (node gallery.mjs list)`);
  const copied = copyKit(item, dir);
  console.log(`${item.slug} 키트를 ${path.resolve(dir)} 에 복사했습니다:\n  ${copied.join("\n  ")}`);
  console.log(`바꿔 쓸 자리:\n  ${(item.slots ?? []).join("\n  ")}`);
  console.log(`다음:\n  ${(item.kit.run ?? []).join("\n  ")}\n  node validate.mjs project.json`);
  if (item.kit.kind === "timeline-full" && item.slug === "motion-styles-five")
    console.log("  (이 예시는 templates/scenes/*.js 와 templates/scripts/*.js 도 프로젝트의 scenes/, scripts/ 에 있어야 합니다)");
} else {
  console.error(`모르는 명령: ${cmd} (list | recommend | directions | refs | use)`);
  process.exit(1);
}
