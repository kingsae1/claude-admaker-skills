// 템포 추천: 광고 길이·규격·모션 방향·요청 낱말(·사용자 음악 BPM)로 템포 하나를 추천하고 다른 템포 3개를 함께 내놓는다.
// 규칙은 references/tempo.md. 순수 모듈 + CLI(파일·네트워크 없음, 결정적). interludes.mjs의 템포 등급(fast/mid/slow)과 양을 그대로 쓴다.
//
//   recommendTempo({ duration, aspect, direction, request, musicBpm, narration })
//     → { mode: "preset" | "music", options: [{ n, id, name, bpm, bars, beats, cutBeats, cutSec, tempo, dose, why, bgmPrompt, recommended }], note }
//   fitBpm(range, center, duration) → 길이가 마디(4박)로 딱 떨어지는 BPM (범위 안에서 center에 가장 가까운 것)
//
// CLI:  node tempo.mjs recommend --duration 15 [--aspect 9:16] [--direction beat-montage] [--request "…"] [--music-bpm 124] [--narration] [--json] [--out tempo-options.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tempoClass, dosage } from "./interludes.mjs";

/**
 * 템포 결. range는 BPM 범위, center는 범위 안 기본값, cut은 한 컷 목표 길이(초),
 * dirs는 이 결이 어울리는 모션 방향(motion-directions.md id), words는 요청 낱말.
 * genre는 BGM 생성 프롬프트(영문)에 들어가는 장르·악기 묘사.
 */
export const FEELS = Object.freeze([
  {
    id: "cinematic", name: "시네마틱 슬로우", range: [64, 80], center: 72, cut: 2.6,
    dirs: ["product-hero", "glossy-signature", "spatial-3d"],
    words: /프리미엄|고급|럭셔리|시네마틱|향수|주얼리|보석|시계|호텔|자동차|디테일|질감|제품\s*(?:극대화|클로즈업)|우아|웅장/,
    genre: "cinematic ambient score, slow swelling strings and soft piano, deep sub pulse, sparse percussion",
    line: "제품을 오래 보여 주고 시그니처 한 번에 힘을 모음",
  },
  {
    id: "chill", name: "감성 칠", range: [82, 96], center: 90, cut: 2.0,
    dirs: ["handwritten-warm", "print-collage"],
    words: /감성|카페|커피|베이커리|힐링|잔잔|차분|따뜻|일상|브이로그|뷰티|스킨케어|꽃|여행|손글씨/,
    genre: "warm lo-fi chill hop, mellow electric piano, soft vinyl texture, laid-back swung drums",
    line: "따뜻하고 여유 있게, 문구를 읽을 시간이 넉넉함",
  },
  {
    id: "groove", name: "그루브 미드", range: [98, 112], center: 106, cut: 1.5,
    dirs: ["playful-bounce", "info-map", "print-collage", "food-sizzle"],
    words: /음식|맛집|고기|고깃집|삼겹살|숯불|구이|갈비|회식|외식|식당|신메뉴|배달|패션|라이프스타일|귀여|키즈|반려|펫|생활|앱|서비스|정보|지도|매장/,
    genre: "upbeat funk-pop groove, bouncy bass, crisp claps and finger snaps, bright guitar plucks",
    line: "통통 튀는 리듬, 정보와 재미를 같이",
  },
  {
    id: "drive", name: "업비트 드라이브", range: [114, 124], center: 120, cut: 1.2,
    dirs: ["editorial-kinetic", "product-hero", "info-map"],
    words: /런칭|신제품|테크|스마트|가전|모던|깔끔|산뜻|IT/,
    genre: "bright upbeat electro-pop, steady four-on-the-floor kick, shimmering synth chords, clean claps",
    line: "광고 기본 속도, 문구와 컷이 박에 또렷하게 맞음",
  },
  {
    id: "punch", name: "하우스 펀치", range: [124, 132], center: 128, cut: 0.95,
    dirs: ["beat-montage", "offer-punch", "editorial-kinetic"],
    words: /세일|할인|특가|타임\s*딜|오픈|이벤트|페스티벌|몽타주|비트|EDM|댄스|쇼핑|블랙\s*프라이데이|쿠폰|역동|에너지/,
    genre: "energetic EDM house, punchy sidechained kick, rising white-noise riser into a big drop, stabby synths",
    line: "박마다 컷·히트, 드롭에 가격이나 제품 공개",
  },
  {
    id: "rush", name: "트랩 러시(하프타임)", range: [136, 150], center: 140, cut: 0.85,
    dirs: ["glitch-tech", "spatial-3d", "beat-montage"],
    words: /게임|e\s*스포츠|스포츠|힙|스트릿|스니커즈|글리치|사이버|해킹|레이싱|익스트림/,
    genre: "hard-hitting trap, half-time drums, rolling hi-hats, heavy 808 bass, glitchy risers",
    line: "큰 컷은 하프타임으로 묵직하게, 하이햇에 작은 히트를 촘촘히",
  },
  {
    id: "chip", name: "칩튠 아케이드", range: [144, 160], center: 150, cut: 0.8,
    dirs: ["pixel-retro"],
    words: /레트로|픽셀|도트|8\s*비트|아케이드|오락실|게임/,
    genre: "8-bit chiptune arcade loop, square-wave lead, bouncy triangle bass, tight noise drums",
    line: "도트 그래픽이 계단식으로 박에 튐",
  },
]);

const BEATS_PER_BAR = 4;
const round1 = (x) => Math.round(x * 10) / 10;

/** 길이가 마디로 딱 떨어지는 BPM. 범위 안에 없으면 center. */
export function fitBpm([lo, hi], center, duration) {
  if (!(duration > 0)) return center;
  let best = null;
  for (let bars = 1; bars <= 200; bars++) {
    const bpm = (60 * BEATS_PER_BAR * bars) / duration;
    if (bpm < lo - 1e-6 || bpm > hi + 1e-6) continue;
    if (Math.abs(bpm - Math.round(bpm)) > 0.05 && Math.abs(bpm * 2 - Math.round(bpm * 2)) > 0.05) continue; // 정수·반정수 BPM만
    if (!best || Math.abs(bpm - center) < Math.abs(best - center)) best = bpm;
  }
  return best != null ? round1(best) : center;
}

/** 한 컷 몇 박: 목표 길이(초)에 가장 가까운 1·2·4·8박 */
function cutBeatsFor(bpm, target) {
  const B = 60 / bpm;
  return [1, 2, 4, 8].reduce((a, k) => (Math.abs(k * B - target) < Math.abs(a * B - target) ? k : a), 1);
}

function describe({ bpm, duration, direction, request, cutTarget, cutBeats, feelBpm = bpm }) {
  const beats = duration * bpm / 60;
  const bars = beats / BEATS_PER_BAR;
  cutBeats ??= cutBeatsFor(bpm, cutTarget);
  const tempo = tempoClass({ bpm: feelBpm, direction, request }); // 하프·더블타임은 체감 BPM으로 등급을 매김
  const d = dosage(tempo, duration);
  return {
    bpm, beats: round1(beats), bars: round1(bars), wholeBars: Math.abs(bars - Math.round(bars)) < 0.05,
    beatSec: +(60 / bpm).toFixed(3), cutBeats, cutSec: +((cutBeats * 60) / bpm).toFixed(2),
    tempo, dose: { interludes: d.interludes, graphicTransitions: d.graphicTransitions, hitsPerBar: d.intensity.hitsPerBar },
  };
}

function bgmPrompt(feel, o, duration) {
  const lift = Math.round(duration * 0.6 * 10) / 10;
  return `${feel.genre}, ${o.bpm} BPM, 4/4, ${duration} seconds (${o.wholeBars ? `${Math.round(o.bars)} bars` : `about ${o.bars} bars`}), `
    + `energy lift around ${lift}s, ends cleanly on a downbeat, no vocals`;
}

/** 요청·방향·길이·규격으로 결마다 점수 */
function scoreFeels({ duration, aspect, direction, request, narration }) {
  return FEELS.map((f) => {
    let s = 0;
    const why = [];
    if (direction && f.dirs.includes(direction)) { s += 3; why.push(`모션 방향 ${direction}과 맞음`); }
    const m = request && request.match(f.words);
    if (m) { s += 2.5; why.push(`요청 낱말 "${m[0]}"`); }
    if (f.id === "drive") s += 0.8; // 아무 단서가 없을 때 기본
    if (f.id === "punch") s += 0.4;
    if (duration <= 8) {
      if (["punch", "rush", "drive"].includes(f.id)) { s += 1; why.push("6초 범퍼는 촘촘해야 함"); }
      if (["cinematic", "chill"].includes(f.id)) s -= 1.5;
    } else if (duration >= 45) {
      if (["cinematic", "chill", "groove"].includes(f.id)) { s += 0.6; why.push("긴 광고는 숨 쉴 구간이 필요함"); }
      if (["rush", "chip"].includes(f.id)) s -= 0.6;
    }
    if (aspect === "9:16" && ["punch", "drive", "rush"].includes(f.id)) { s += 0.4; why.push("세로 숏폼은 첫 1초 리듬이 중요"); }
    if (narration && ["rush", "chip"].includes(f.id)) s -= 0.8;
    if (narration && ["drive", "groove"].includes(f.id)) { s += 0.4; why.push("내레이션이 박 사이에 들어갈 여유"); }
    return { f, s, why };
  }).sort((a, b) => b.s - a.s);
}

/**
 * 추천 1개 + 다른 템포 3개. 다른 템포에는 추천보다 느린 것 하나, 빠른 것 하나가 꼭 들어간다.
 * musicBpm이 있으면(사용자 음악·앱 BGM 분석값) 음악은 그대로 두고 편집 밀도(컷 길이·히트)를 고르는 목록이 된다.
 */
export function recommendTempo({ duration = 15, aspect, direction, request = "", musicBpm, narration = false } = {}) {
  const ctx = { duration, aspect, direction, request, narration };
  const ranked = scoreFeels(ctx);

  if (musicBpm > 0) {
    const bpm = round1(musicBpm);
    // 음악 BPM이 들어가는 결(여럿이면 점수 높은 것, 없으면 범위가 가장 가까운 것)의 컷 길이·설명을 씀
    const dist = (f) => (bpm < f.range[0] ? f.range[0] - bpm : bpm > f.range[1] ? bpm - f.range[1] : 0);
    const best = [...ranked].sort((a, b) => dist(a.f) - dist(b.f) || b.s - a.s)[0];
    const base = describe({ bpm, duration, direction, request, cutTarget: best.f.cut });
    const k = base.cutBeats;
    const options = [
      { id: "music-as-is", name: "원곡 템포 그대로", ...base, why: [`음악 ${bpm} BPM 그대로, 한 컷 ${k}박`, best.f.line], recommended: true },
      { id: "music-half", name: "하프타임 느낌", ...describe({ bpm, duration, direction, request, cutBeats: k * 2, feelBpm: bpm / 2 }), why: ["같은 음악, 컷을 두 배 길게. 큰 변화는 마디 첫 박에만", "제품·문구를 더 오래 보여 줌"] },
      { id: "music-double", name: "더블타임 느낌", ...describe({ bpm, duration, direction, request, cutBeats: Math.max(0.5, k / 2), feelBpm: bpm * 2 }), why: ["같은 음악, 피크·드롭 구간만 반 박(또는 1박)으로 쪼갬", "몽타주·세일처럼 몰아치는 구간에"] },
    ];
    // 분석기가 반/두 배로 잡았을 수 있는 경우
    let note = null;
    if (bpm < 75) note = `${bpm} BPM은 느린 편입니다. 귀로 들어 킥이 두 배로 느껴지면 ${round1(bpm * 2)} BPM 그리드로 씁니다(beatSec 절반).`;
    if (bpm > 165) note = `${bpm} BPM은 빠른 편입니다. 귀로 들어 반으로 느껴지면 ${round1(bpm / 2)} BPM 그리드로 씁니다(beatSec 두 배).`;
    // 음악을 바꾸는 선택지: 원곡과 가장 다른 결 중 점수가 높은 것
    const other = ranked.find((r) => bpm < r.f.range[0] - 6 || bpm > r.f.range[1] + 6);
    if (other) {
      const o = describe({ bpm: fitBpm(other.f.range, other.f.center, duration), duration, direction, request, cutTarget: other.f.cut });
      options.push({ id: other.f.id, name: `다른 음악: ${other.f.name}`, ...o, why: ["BGM을 새로 고르거나 만들어야 함", other.f.line], bgmPrompt: bgmPrompt(other.f, o, duration), changesMusic: true });
    }
    return { mode: "music", options: options.map((o, i) => ({ n: i + 1, ...o })), note };
  }

  const toOption = (r, recommended = false) => {
    const bpm = fitBpm(r.f.range, r.f.center, duration);
    const o = describe({ bpm, duration, direction, request, cutTarget: r.f.cut });
    const why = [...r.why];
    if (o.wholeBars) why.push(`${duration}초가 ${Math.round(o.bars)}마디로 딱 떨어짐`);
    why.push(r.f.line);
    return { id: r.f.id, name: r.f.name, ...o, why, bgmPrompt: bgmPrompt(r.f, o, duration), recommended };
  };
  const top = ranked[0];
  const rest = ranked.slice(1);
  const slower = rest.find((r) => r.f.center < top.f.center);
  const faster = rest.find((r) => r.f.center > top.f.center);
  const picks = [slower, faster].filter(Boolean);
  // 셋째 자리: 남은 것 중 점수 높은 것, 같으면 추천 템포에 가까운 것
  const left = rest.filter((r) => !picks.includes(r))
    .sort((a, b) => b.s - a.s || Math.abs(a.f.center - top.f.center) - Math.abs(b.f.center - top.f.center));
  // BPM이 같은 줄은 하나만 (예: 칩튠 144와 트랩 144)
  const options = [toOption(top, true)];
  for (const r of [...picks, ...left]) {
    if (options.length >= 4) break;
    const o = toOption(r);
    if (!options.some((x) => Math.abs(x.bpm - o.bpm) < 3)) options.push(o);
  }
  options.splice(1, Infinity, ...options.slice(1).sort((a, b) => a.bpm - b.bpm));
  return { mode: "preset", options: options.map((o, i) => ({ n: i + 1, ...o })), note: null };
}

/** 사용자에게 보여 줄 목록(번호 목록 하나, 1번 추천 + 마지막 줄 "직접 정하기") */
export function formatOptions(res, duration) {
  const lines = [];
  for (const o of res.options) {
    lines.push(`${o.n}. ${o.name} · ${o.bpm} BPM${o.recommended ? " (추천)" : ""} — ${o.why.join(", ")}`);
    lines.push(`     ${duration}초 = ${o.wholeBars ? Math.round(o.bars) : o.bars}마디, 한 컷 ${o.cutBeats}박(${o.cutSec}초), 템포 등급 ${o.tempo}: 모션 전용 씬 최대 ${o.dose.interludes}개, 그래픽 전환 ${o.dose.graphicTransitions}, 마디당 히트 ${o.dose.hitsPerBar}`);
    if (o.bgmPrompt) lines.push(`     BGM 프롬프트: ${o.bgmPrompt}`);
  }
  lines.push(`${res.options.length + 1}. 직접 정하기 — BPM 숫자나 "이 노래 느낌"처럼 말하면 그 템포로 만듦`);
  if (res.note) lines.push(`참고: ${res.note}`);
  return lines.join("\n");
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
  if (args[0] !== "recommend") {
    console.log('node tempo.mjs recommend --duration 15 [--aspect 9:16] [--direction beat-montage] [--request "…"] [--music-bpm 124] [--narration] [--json] [--out tempo-options.json]');
    process.exit(0);
  }
  const duration = Number(opt("duration", 15));
  const res = recommendTempo({
    duration, aspect: opt("aspect"), direction: opt("direction"), request: opt("request", ""),
    musicBpm: Number(opt("music-bpm", 0)) || undefined, narration: args.includes("--narration"),
  });
  const out = opt("out");
  if (out) fs.writeFileSync(out, JSON.stringify({ duration, ...res }, null, 2));
  if (args.includes("--json")) console.log(JSON.stringify(res, null, 2));
  else {
    console.log(res.mode === "music" ? "템포 (음악 BPM은 그대로, 편집 밀도를 고름. 사용자에게 이 목록을 번호 목록 하나로 보여 줌, 1번 추천):" : "템포 (사용자에게 이 목록을 번호 목록 하나로 보여 줌, 1번 추천):");
    console.log(formatOptions(res, duration));
    console.log("고른 뒤: TREATMENT.md 큐맵의 템포 줄과 timeline.mjs의 BPM에 적고, 앱 BGM이면 고른 줄의 BGM 프롬프트로 만든 다음 analyzeBeats 값(ANALYSIS)을 그대로 씀 (references/tempo.md)");
    if (out) console.log(`→ ${path.resolve(out)}`);
  }
}
